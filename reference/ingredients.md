# Ingredient Catalog

The shopping list uses this table to group items by aisle, merge duplicates, and apply how we like to buy things.
Recipes can use any name in **Ingredient** or **Also called** (plurals and extra words in front, like "large sweet
potatoes", match too). When a recipe uses a new ingredient, add a row here. The validator warns about names it can't find.

- **Aisle:** one of Produce, Seafood, Meat & Poultry, Dairy & Eggs, Refrigerated, Frozen, Bakery, Grains & Pasta,
  Canned & Jarred, Pantry, Spices & Condiments.
- **Kind:**
  - `key` means the ingredient defines a dish. The planner warns when a week repeats it.
  - `staple` means we always have it at home, so it stays off the shopping list. The app shows it under "check the pantry".
  - Blank means an ordinary ingredient.
- **Buy as:** what to put in the Instacart cart, if it differs from the name.
- **Instacart product:** the exact product the family usually buys at Wegmans on Instacart, with its package size.
  Search for this name when filling the cart. Blank means there's no usual product yet, so shop by the name and
  **Buy as**. When the family settles on a new product, update this column.

## Produce
| Ingredient | Aisle | Kind | Buy as | Instacart product | Also called |
|---|---|---|---|---|---|
| Apple | Produce | | | Wegmans Organic Honeycrisp Apple | |
| Arugula | Produce | | | Wegmans Baby Arugula Salad (5 oz) | baby arugula |
| Asparagus | Produce | key | | Wegmans Microwaveable Asparagus Tips (8 oz) | |
| Avocado | Produce | | | Avocado | |
| Bell pepper | Produce | | | Wegmans Organic Red Bell Pepper | red bell pepper, yellow bell pepper |
| Broccoli | Produce | key | | Wegmans Organic Broccoli Florets (10 oz) | broccoli florets |
| Butternut squash | Produce | key | | Wegmans Butternut Squash (20 oz) | |
| Cabbage | Produce | key | | Wegmans Cabbage, Shredded, Red (10 oz) | shredded cabbage |
| Carrots | Produce | key | Large orange carrots (not baby carrots) | Wegmans Organic Carrots | carrot |
| Cauliflower | Produce | key | 2 lb family pack of pre-cut florets | Wegmans Cauliflower Florets, FAMILY PACK (2 lb) | cauliflower florets |
| Cherry tomatoes | Produce | | | Wegmans Cherry Tomatoes (1 pt) | |
| Cucumber | Produce | | | Wegmans Organic Mini Seedless Cucumbers (12 oz) | English cucumber |
| Fresh cilantro | Produce | | | Wegmans Organic Cilantro | cilantro |
| Fresh dill | Produce | | | Wegmans Organic Dill | dill |
| Fresh ginger | Produce | | | | ginger root |
| Fresh parsley | Produce | | | Wegmans Organic Italian Parsley | parsley |
| Fresh thyme | Produce | | | | |
| Garlic | Produce | staple | | Bulk Garlic | garlic cloves |
| Green beans | Produce | key | | Wegmans Organic French Beans (8 oz) | |
| Kale | Produce | | | Wegmans Organic Kale Greens (12 oz) | baby kale |
| Leeks | Produce | key | | Wegmans Cleaned & Cut Leeks (8 oz) | |
| Lemon | Produce | | | Wegmans Lemons | lemon juice, lemon zest |
| Lime | Produce | | | Large Fresh Limes | lime juice |
| Orange | Produce | | | California Navel Oranges | |
| Radishes | Produce | key | | Wegmans Radishes (16 oz) | |
| Red onion | Produce | | | Red Onions | |
| Spinach | Produce | | | Wegmans Organic Baby Spinach (5 oz) | baby spinach |
| Sugar snap peas | Produce | | | Wegmans Microwavable Sugar Snap Peas (8 oz) | snap peas |
| Sweet potatoes | Produce | key | | Wegmans Organic Sweet Potatoes (48 oz bag) | |
| Yellow onion | Produce | | | Wegmans Organic Onions, Yellow (48 oz) | onion |
| Baby potatoes | Produce | key | | Wegmans Organic Baby Medley Potatoes (24 oz) | |
| Fingerling potatoes | Produce | key | | | |
| Yellow potatoes | Produce | key | | Wegmans Baby Gold Potatoes, FAMILY PACK (48 oz) | Yukon gold potatoes |
| Zucchini | Produce | key | | Green Squash (Zucchini) | summer squash |

## Seafood, Meat & Poultry
| Ingredient | Aisle | Kind | Buy as | Instacart product | Also called |
|---|---|---|---|---|---|
| Salmon | Seafood | key | | Wegmans Fresh EU Organic Salmon Fillet | salmon fillets |
| Cod | Seafood | key | | Wegmans Atlantic Cod Fillets, FAMILY PACK (~2 lb) | cod fillets, white fish |
| Shrimp | Seafood | key | Peeled & deveined | Wegmans Uncooked Peeled & Deveined Shrimp (31/40 Count) | |
| Sea scallops | Seafood | key | | | scallops |
| Chicken breasts | Meat & Poultry | key | | Wegmans Organic Thin Sliced Chicken Breast | thin-cut chicken breasts |
| Chicken sausage | Meat & Poultry | key | Gluten-free chicken sausage | Wegmans Organic Spinach & Garlic with Asiago Chicken Sausage (12 oz) | GF chicken sausage |
| Ground turkey | Meat & Poultry | key | | Wegmans Organic Ground Turkey (16 oz) | |

## Dairy, Eggs & Refrigerated
| Ingredient | Aisle | Kind | Buy as | Instacart product | Also called |
|---|---|---|---|---|---|
| Butter | Dairy & Eggs | staple | | Kerrygold Irish Grass-Fed Unsalted Butter Sticks | |
| Eggs | Dairy & Eggs | key | | Wegmans Organic Large Brown Eggs, 12 Count, Cage Free | |
| Feta | Dairy & Eggs | | Block of feta | Odyssey Feta, Gluten Free, Reduced Fat, Chunk (8 oz) | feta cheese |
| Goat cheese | Dairy & Eggs | | | Wegmans Fresh Goat Cheese Mild (4 oz) | crumbled goat cheese |
| Mozzarella pearls | Dairy & Eggs | | | BelGioioso Cheese, Fresh Mozzarella, Pearls (8 oz) | fresh mozzarella pearls |
| Greek yogurt | Dairy & Eggs | | Plain Greek yogurt | Stonyfield Organic Greek Plain Organic Whole Milk Yogurt | plain Greek yogurt |
| Parmesan | Dairy & Eggs | | | BelGioioso Parmesan Cheese - Grated (5 oz) | grated Parmesan |
| Ricotta | Dairy & Eggs | | Whole milk ricotta | Wegmans Whole Milk Ricotta Cheese (15 oz) | ricotta cheese |
| Shredded Mexican blend cheese | Dairy & Eggs | | | Wegmans Sharp Cheddar Shredded Cheese (8 oz) | shredded cheese, shredded cheddar |
| Extra-firm tofu | Refrigerated | key | | Wegmans Organic Extra Firm Tofu (14 oz) | tofu |
| GF pesto | Refrigerated | | Certified gluten-free basil pesto | Wegmans Italian Classics Basil Pesto Sauce (6.7 oz) | pesto, basil pesto |
| Salsa | Refrigerated | | | Newman's Own Salsa, Mild, Chunky (16 oz) | |
| Guacamole | Refrigerated | | | Wegmans Guacamole (12 oz) | |
| Frozen peas | Frozen | | | Wegmans Frozen Sweet Peas (16 oz) | peas |

## Bakery, Grains & Pasta
| Ingredient | Aisle | Kind | Buy as | Instacart product | Also called |
|---|---|---|---|---|---|
| GF bread | Bakery | | GF baguette, sourdough, or crusty loaf | | GF baguette, GF crusty bread |
| GF flatbreads | Bakery | | | BFree Naan Bread, Gluten Free, Stone Baked | GF flatbread crusts |
| Corn tortillas | Bakery | | | La Banderita Corn Tortillas, White (16 oz) | |
| Corn tostada shells | Bakery | | | | tostada shells |
| Flour tortillas | Bakery | | | Mission Super Soft Flour Tortillas, Soft Taco (10 ct) | tortillas |
| Quinoa | Grains & Pasta | | | Bob's Red Mill Quinoa, Organic, Whole Grain (26 oz) | |
| Brown rice | Grains & Pasta | | | Wegmans Organic Long Grain Brown Rice (32 oz) | |
| Instant rice | Grains & Pasta | | Instant or microwavable pouch rice | | pouch rice |
| Sorghum | Grains & Pasta | | | | |
| GF pasta | Grains & Pasta | | | Barilla Gluten Free Penne Pasta (12 oz) | GF fusilli, GF penne |
| GF rice noodles | Grains & Pasta | | | Wegmans Organic White Rice Noodles (7.7 oz) | rice noodles |
| Potato gnocchi | Grains & Pasta | | Gluten-free shelf-stable potato gnocchi | De Cecco Gnocchi, Gluten-Free, Fresh Potato (17.6 oz) | gnocchi |
| Red lentils | Grains & Pasta | key | | Wegmans Organic Red Lentils (16 oz) | |
| Green lentils | Grains & Pasta | key | | Wegmans Organic French Green Lentils (16 oz) | |
| Polenta | Grains & Pasta | | Tube of pre-cooked polenta | Ancient Harvest Polenta, Traditional Italian (18 oz tube) | tube polenta |

## Canned & Jarred
| Ingredient | Aisle | Kind | Buy as | Instacart product | Also called |
|---|---|---|---|---|---|
| Black beans | Canned & Jarred | key | | Wegmans Organic Black Beans (15 oz) | |
| Cannellini beans | Canned & Jarred | key | | Wegmans Cannellini Beans (15.5 oz) | white beans |
| Chickpeas | Canned & Jarred | key | | Wegmans Garbanzo Beans (15.5 oz) | garbanzo beans |
| Pinto beans | Canned & Jarred | key | | | |
| Beets | Canned & Jarred | key | | Wegmans No Salt Added Sliced Beets (15 oz) | canned beets |
| Coconut milk | Canned & Jarred | | Full-fat coconut milk | Wegmans Organic Unsweetened Coconut Milk (13.5 fl oz) | |
| Crushed tomatoes | Canned & Jarred | | | Tuttorosso Tomatoes, Crushed (15 oz) | |
| Tomato sauce | Canned & Jarred | | | | |
| Marinara sauce | Canned & Jarred | | | Wegmans Organic Italian Classics Marinara Pasta Sauce (23.5 oz) | |
| Roasted red peppers | Canned & Jarred | | | Mezzetta Bell Pepper Strips, Roasted Red, Mild (16 oz) | |
| Kalamata olives | Canned & Jarred | | | Wegmans Kalamata Olives, Pits Removed | olives |
| Sweet corn | Canned & Jarred | | | Wegmans Crisp N Sweet Whole Kernel Corn (15.25 oz) | canned sweet corn, corn |
| Pickled red onions | Canned & Jarred | | | | |
| Vegetable broth | Canned & Jarred | | GF low-sodium vegetable broth | Wegmans Organic Vegetable Broth (32 fl oz) | broth, GF vegetable broth, low-sodium vegetable broth |
| Red lentil soup | Canned & Jarred | | | | lentil soup |

## Pantry
| Ingredient | Aisle | Kind | Buy as | Instacart product | Also called |
|---|---|---|---|---|---|
| Cashews | Pantry | | | Wegmans Raw Whole Cashews (9.5 oz) | raw cashews |
| Pine nuts | Pantry | | | | |
| Pumpkin seeds | Pantry | | | Stony Brook Pepitas (3 oz) | pepitas |
| Walnuts | Pantry | | | Wegmans Chopped Walnuts (8 oz) | |
| Olive oil | Pantry | staple | | Wegmans Italian Classics Italian Extra Virgin Olive Oil (33.8 fl oz) | extra virgin olive oil |
| Avocado oil | Pantry | staple | | | |
| Toasted sesame oil | Pantry | staple | | Wegmans Toasted Sesame Oil (5 fl oz) | sesame oil |
| Rice vinegar | Pantry | staple | | | |
| Tamari | Pantry | staple | | Kikkoman Soy Sauce, Gluten Free, Tamari (10 fl oz) | GF soy sauce |
| Maple syrup | Pantry | staple | | Wegmans Organic Pure Maple Syrup (12 fl oz) | |
| Honey | Pantry | staple | | Wegmans Organic Wild & Raw Honey (16 oz) | |
| Cornstarch | Pantry | staple | | Rumford Corn Starch (6.5 oz) | |
| Water | Pantry | staple | | | |

## Spices & Condiments
| Ingredient | Aisle | Kind | Buy as | Instacart product | Also called |
|---|---|---|---|---|---|
| Salt | Spices & Condiments | staple | | | kosher salt |
| Salt and pepper | Spices & Condiments | staple | | | black pepper, pepper |
| Cumin | Spices & Condiments | staple | | | ground cumin |
| Turmeric | Spices & Condiments | staple | | | ground turmeric |
| Ground ginger | Spices & Condiments | staple | | | ginger powder |
| Garlic powder | Spices & Condiments | staple | | McCormick Garlic Powder | |
| Dried oregano | Spices & Condiments | staple | | | oregano |
| Dried thyme | Spices & Condiments | staple | | | thyme |
| Smoked paprika | Spices & Condiments | staple | | | |
| Red pepper flakes | Spices & Condiments | staple | | | |
| Shawarma spice blend | Spices & Condiments | | | | |
| GF taco seasoning | Spices & Condiments | | | Siete Mild Taco Seasoning | taco seasoning |
| Curry powder | Spices & Condiments | | | Wegmans Organic Seasoning, Powder, Curry | yellow curry powder |
| Dijon mustard | Spices & Condiments | staple | | Grey Poupon Dijon Mustard (8 oz) | mustard, yellow mustard |
| Zing dressing | Spices & Condiments | staple | | | Jar A |
