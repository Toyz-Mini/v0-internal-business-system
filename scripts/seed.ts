import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Starting database seed...');

  try {
    console.log('Step 1: Seeding categories...');
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .upsert([
        {
          name: 'Main Dishes',
          description: 'Main course items',
          sort_order: 1,
          is_active: true
        },
        {
          name: 'Beverages',
          description: 'Drinks and beverages',
          sort_order: 2,
          is_active: true
        },
        {
          name: 'Sides',
          description: 'Side dishes and extras',
          sort_order: 3,
          is_active: true
        }
      ], { onConflict: 'name' })
      .select();

    if (catError) {
      console.error('Error seeding categories:', catError);
      throw catError;
    }

    console.log(`Created ${categories?.length} categories`);

    console.log('Step 2: Seeding modifier groups...');
    const { data: modGroups, error: modGroupError } = await supabase
      .from('modifier_groups')
      .upsert([
        {
          name: 'Spice Level',
          is_required: true,
          max_selection: 1
        },
        {
          name: 'Add-ons',
          is_required: false,
          max_selection: 3
        }
      ], { onConflict: 'name' })
      .select();

    if (modGroupError) {
      console.error('Error seeding modifier groups:', modGroupError);
      throw modGroupError;
    }

    console.log(`Created ${modGroups?.length} modifier groups`);

    if (modGroups && modGroups.length > 0) {
      console.log('Step 3: Seeding modifier options...');
      const spiceLevelGroup = modGroups.find(g => g.name === 'Spice Level');
      const addOnsGroup = modGroups.find(g => g.name === 'Add-ons');

      const modOptions = [];

      if (spiceLevelGroup) {
        modOptions.push(
          {
            group_id: spiceLevelGroup.id,
            name: 'Mild',
            price_adjustment: 0,
            is_default: true
          },
          {
            group_id: spiceLevelGroup.id,
            name: 'Medium',
            price_adjustment: 0,
            is_default: false
          },
          {
            group_id: spiceLevelGroup.id,
            name: 'Spicy',
            price_adjustment: 0,
            is_default: false
          }
        );
      }

      if (addOnsGroup) {
        modOptions.push(
          {
            group_id: addOnsGroup.id,
            name: 'Extra Cheese',
            price_adjustment: 2.00,
            is_default: false
          },
          {
            group_id: addOnsGroup.id,
            name: 'Extra Sauce',
            price_adjustment: 1.50,
            is_default: false
          }
        );
      }

      const { data: options, error: optError } = await supabase
        .from('modifier_options')
        .upsert(modOptions, { onConflict: 'group_id,name' })
        .select();

      if (optError) {
        console.error('Error seeding modifier options:', optError);
        throw optError;
      }

      console.log(`Created ${options?.length} modifier options`);
    }

    console.log('Step 4: Seeding products...');
    if (categories && categories.length > 0) {
      const mainDishCategory = categories.find(c => c.name === 'Main Dishes');
      const beverageCategory = categories.find(c => c.name === 'Beverages');

      const { data: products, error: prodError } = await supabase
        .from('products')
        .upsert([
          {
            category_id: mainDishCategory?.id,
            name: 'Ayam Gunting Original',
            description: 'Classic scissor-cut chicken',
            price: 18.90,
            cost_price: 8.50,
            sku: 'AG-001',
            is_available: true,
            sort_order: 1
          },
          {
            category_id: mainDishCategory?.id,
            name: 'Ayam Gunting Sambal',
            description: 'Scissor-cut chicken with spicy sambal',
            price: 19.90,
            cost_price: 9.00,
            sku: 'AG-002',
            is_available: true,
            sort_order: 2
          },
          {
            category_id: mainDishCategory?.id,
            name: 'Ayam Gunting Buttermilk',
            description: 'Creamy buttermilk scissor-cut chicken',
            price: 20.90,
            cost_price: 9.50,
            sku: 'AG-003',
            is_available: true,
            sort_order: 3
          },
          {
            category_id: beverageCategory?.id,
            name: 'Teh Tarik',
            description: 'Malaysian pulled milk tea',
            price: 3.50,
            cost_price: 0.80,
            sku: 'BEV-001',
            is_available: true,
            sort_order: 1
          },
          {
            category_id: beverageCategory?.id,
            name: 'Iced Lemon Tea',
            description: 'Refreshing iced lemon tea',
            price: 3.00,
            cost_price: 0.60,
            sku: 'BEV-002',
            is_available: true,
            sort_order: 2
          }
        ], { onConflict: 'sku' })
        .select();

      if (prodError) {
        console.error('Error seeding products:', prodError);
        throw prodError;
      }

      console.log(`Created ${products?.length} products`);
    }

    console.log('Step 5: Seeding ingredients...');
    const { data: ingredients, error: ingError } = await supabase
      .from('ingredients')
      .upsert([
        {
          name: 'Chicken Breast',
          unit: 'kg',
          current_stock: 50.00,
          min_stock: 10.00,
          cost_per_unit: 12.50,
          is_active: true
        },
        {
          name: 'Rice',
          unit: 'kg',
          current_stock: 100.00,
          min_stock: 20.00,
          cost_per_unit: 2.50,
          is_active: true
        },
        {
          name: 'Cooking Oil',
          unit: 'liter',
          current_stock: 30.00,
          min_stock: 5.00,
          cost_per_unit: 8.00,
          is_active: true
        },
        {
          name: 'Sambal Sauce',
          unit: 'kg',
          current_stock: 15.00,
          min_stock: 3.00,
          cost_per_unit: 15.00,
          is_active: true
        },
        {
          name: 'Tea Leaves',
          unit: 'kg',
          current_stock: 5.00,
          min_stock: 1.00,
          cost_per_unit: 25.00,
          is_active: true
        }
      ], { onConflict: 'name' })
      .select();

    if (ingError) {
      console.error('Error seeding ingredients:', ingError);
      throw ingError;
    }

    console.log(`Created ${ingredients?.length} ingredients`);

    console.log('Database seed completed successfully!');
    console.log('Summary:');
    console.log(`- ${categories?.length || 0} categories`);
    console.log(`- ${modGroups?.length || 0} modifier groups`);
    console.log(`- ${ingredients?.length || 0} ingredients`);
    console.log('- 5 products');
    console.log('- 5 modifier options');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
