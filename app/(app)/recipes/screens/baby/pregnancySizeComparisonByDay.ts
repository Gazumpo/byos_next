// These comparisons are illustrative and follow completed gestational weeks.
// There is no embryo to compare before week 4, so those entries stay empty.
const pregnancySizeComparisonByWeek: ReadonlyArray<string | undefined> = [
	undefined,
	undefined,
	undefined,
	undefined,
	"a poppy seed",
	"a sesame seed",
	"a pea",
	"a blueberry",
	"a raspberry",
	"a strawberry",
	"a small apricot",
	"a fig",
	"a plum",
	"a peach",
	"a kiwi fruit",
	"an apple",
	"an avocado",
	"a pomegranate",
	"a capsicum",
	"a beef tomato",
	"a banana",
	"a carrot",
	"a papaya",
	"a grapefruit",
	"a corn cob",
	"a cauliflower",
	"a lettuce",
	"a cabbage",
	"a pineapple",
	"a butternut squash",
	"a large cabbage",
	"a coconut",
	"a large sweet potato",
	"a pineapple",
	"a cantaloupe melon",
	"a honeydew melon",
	"a head of romaine lettuce",
	"a winter melon",
	"a leek",
	"a small watermelon",
	"a small pumpkin",
];

export const pregnancySizeComparisonByDay =
	pregnancySizeComparisonByWeek.reduce<Partial<Record<number, string>>>(
		(comparisons, comparison, week) => {
			if (!comparison) {
				return comparisons;
			}

			for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
				const gestationalDay = week * 7 + dayOfWeek;

				if (gestationalDay > 280) {
					break;
				}

				comparisons[gestationalDay] = comparison;
			}

			return comparisons;
		},
		{},
	);
