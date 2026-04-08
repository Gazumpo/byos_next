#!/usr/bin/env python3

"""
Clamp near-black and near-white pixels away from the renderer's edge bands.

The current bitmap renderer treats pixels as "edge-like" when their grayscale
value is below `fuzziness` or above `255 - fuzziness`. This script rewrites
images so pixels in those bands are nudged just outside them.

By default it writes adjusted copies to a sibling output directory.

Examples:
  python3 scripts/normalize_image_extremes.py app/(app)/recipes/screens/bird-image/images
  python3 scripts/normalize_image_extremes.py images --fuzziness 3 --in-place
  python3 scripts/normalize_image_extremes.py images --output-dir /tmp/normalized-images
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Iterable

from PIL import Image


SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif", ".tif", ".tiff"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Adjust image pixels whose grayscale luminance falls inside the "
            "near-black or near-white edge bands."
        )
    )
    parser.add_argument("input_dir", type=Path, help="Directory containing source images")
    parser.add_argument(
        "--fuzziness",
        type=int,
        default=3,
        help="Renderer edge threshold band size. Default: 3",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        help=(
            "Directory to write adjusted files to. Defaults to "
            "<input_dir>_normalized unless --in-place is used."
        ),
    )
    parser.add_argument(
        "--in-place",
        action="store_true",
        help="Overwrite source files instead of writing copies",
    )
    parser.add_argument(
        "--recursive",
        action="store_true",
        help="Process images in nested subdirectories too",
    )
    return parser.parse_args()


def iter_image_paths(root: Path, recursive: bool) -> Iterable[Path]:
    pattern = "**/*" if recursive else "*"
    for path in sorted(root.glob(pattern)):
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS:
            yield path


def luminance(rgb: tuple[int, int, int]) -> int:
    r, g, b = rgb
    return round(0.299 * r + 0.587 * g + 0.114 * b)


def shift_rgb_to_luminance_band(
    rgb: tuple[int, int, int],
    target_luma: int,
) -> tuple[int, int, int]:
    current_luma = luminance(rgb)
    delta = target_luma - current_luma
    shifted = tuple(min(255, max(0, channel + delta)) for channel in rgb)

    adjusted_luma = luminance(shifted)
    if adjusted_luma == target_luma:
        return shifted

    channels = list(shifted)
    direction = 1 if adjusted_luma < target_luma else -1
    remaining = abs(target_luma - adjusted_luma)

    for _ in range(remaining):
        changed = False
        for index, value in enumerate(channels):
            candidate = value + direction
            if 0 <= candidate <= 255:
                channels[index] = candidate
                changed = True
                if luminance(tuple(channels)) == target_luma:
                    return tuple(channels)
        if not changed:
            break

    return tuple(channels)


def normalize_image(image: Image.Image, fuzziness: int) -> tuple[Image.Image, int]:
    if fuzziness < 1 or fuzziness > 127:
        raise ValueError("fuzziness must be between 1 and 127")

    target_dark = fuzziness
    target_light = 255 - fuzziness

    source = image.convert("RGBA")
    pixels = source.load()
    width, height = source.size
    changed_pixels = 0

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            luma = luminance((r, g, b))

            if luma < fuzziness:
                nr, ng, nb = shift_rgb_to_luminance_band((r, g, b), target_dark)
                pixels[x, y] = (nr, ng, nb, a)
                changed_pixels += 1
            elif luma > 255 - fuzziness:
                nr, ng, nb = shift_rgb_to_luminance_band((r, g, b), target_light)
                pixels[x, y] = (nr, ng, nb, a)
                changed_pixels += 1

    if image.mode == "RGBA":
        return source, changed_pixels

    if image.mode == "RGB":
        return source.convert("RGB"), changed_pixels

    if image.mode == "L":
        return source.convert("L"), changed_pixels

    return source, changed_pixels


def destination_for(path: Path, input_dir: Path, output_dir: Path) -> Path:
    relative = path.relative_to(input_dir)
    return output_dir / relative


def process_file(source_path: Path, dest_path: Path, fuzziness: int) -> int:
    with Image.open(source_path) as image:
        normalized, changed_pixels = normalize_image(image, fuzziness)
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        save_kwargs = {}
        if source_path.suffix.lower() in {".jpg", ".jpeg"}:
            save_kwargs["quality"] = 95
        normalized.save(dest_path, **save_kwargs)
        return changed_pixels


def main() -> int:
    args = parse_args()
    input_dir = args.input_dir.expanduser().resolve()

    if not input_dir.exists() or not input_dir.is_dir():
        raise SystemExit(f"Input directory does not exist or is not a directory: {input_dir}")

    if args.in_place and args.output_dir is not None:
        raise SystemExit("Use either --in-place or --output-dir, not both")

    if args.in_place:
        output_dir = input_dir
    else:
        output_dir = (
            args.output_dir.expanduser().resolve()
            if args.output_dir
            else input_dir.parent / f"{input_dir.name}_normalized"
        )

    image_paths = list(iter_image_paths(input_dir, args.recursive))
    if not image_paths:
        print(f"No supported images found in {input_dir}")
        return 0

    total_changed = 0
    changed_files = 0

    for source_path in image_paths:
        dest_path = source_path if args.in_place else destination_for(source_path, input_dir, output_dir)
        changed_pixels = process_file(source_path, dest_path, args.fuzziness)
        total_changed += changed_pixels
        if changed_pixels > 0:
            changed_files += 1
        print(f"{source_path.name}: changed {changed_pixels} pixels")

    print(
        f"Processed {len(image_paths)} images, changed {total_changed} pixels across {changed_files} files."
    )
    if not args.in_place:
        print(f"Output written to {output_dir}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
