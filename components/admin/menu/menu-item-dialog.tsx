'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import useSWR from 'swr';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const menuItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be less than 200 characters'),
  sku: z.string().max(50, 'SKU must be less than 50 characters').optional(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  price: z.number().positive('Price must be greater than 0'),
  cost_price: z.number().min(0, 'Cost price cannot be negative').optional(),
  category_id: z.string().optional(),
  is_available: z.boolean(),
  sort_order: z.number().int().min(0),
});

type MenuItemFormData = z.infer<typeof menuItemSchema>;

interface MenuItem {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  price: number;
  cost_price: number;
  category_id: string | null;
  is_available: boolean;
  sort_order: number;
}

interface Category {
  id: string;
  name: string;
}

interface ModifierGroup {
  id: string;
  name: string;
}

interface MenuItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItem: MenuItem | null;
  categories: Category[];
  onSuccess: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function MenuItemDialog({
  open,
  onOpenChange,
  menuItem,
  categories,
  onSuccess,
}: MenuItemDialogProps) {
  const [selectedModifierGroups, setSelectedModifierGroups] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string>('');

  const { data: modifierGroupsData } = useSWR<{
    success: boolean;
    data: ModifierGroup[];
  }>('/api/modifier-groups', fetcher);

  const { data: existingItemData } = useSWR(
    menuItem ? `/api/menu-items/${menuItem.id}` : null,
    fetcher
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: '',
      sku: '',
      description: '',
      price: 0,
      cost_price: 0,
      category_id: '',
      is_available: true,
      sort_order: 0,
    },
  });

  const isAvailable = watch('is_available');

  useEffect(() => {
    if (menuItem) {
      reset({
        name: menuItem.name,
        sku: menuItem.sku || '',
        description: menuItem.description || '',
        price: menuItem.price,
        cost_price: menuItem.cost_price,
        category_id: menuItem.category_id || '',
        is_available: menuItem.is_available,
        sort_order: menuItem.sort_order,
      });

      if (existingItemData?.data?.modifierGroupIds) {
        setSelectedModifierGroups(existingItemData.data.modifierGroupIds);
      }
    } else {
      reset({
        name: '',
        sku: '',
        description: '',
        price: 0,
        cost_price: 0,
        category_id: '',
        is_available: true,
        sort_order: 0,
      });
      setSelectedModifierGroups([]);
    }
    setServerError('');
  }, [menuItem, existingItemData, reset]);

  const handleModifierGroupToggle = (groupId: string) => {
    setSelectedModifierGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const onSubmit = async (data: MenuItemFormData) => {
    setServerError('');
    try {
      const url = menuItem
        ? `/api/menu-items/${menuItem.id}`
        : '/api/menu-items';
      const method = menuItem ? 'PATCH' : 'POST';

      const payload = {
        ...data,
        category_id: data.category_id || null,
        sku: data.sku || null,
        description: data.description || null,
        modifierGroupIds: selectedModifierGroups,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setServerError(result.message || 'Duplicate SKU detected');
        } else {
          throw new Error(result.message || result.error || 'Failed to save menu item');
        }
        return;
      }

      toast.success(menuItem ? 'Menu item updated successfully' : 'Menu item created successfully');
      onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save menu item';
      setServerError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const modifierGroups = modifierGroupsData?.data || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{menuItem ? 'Edit Menu Item' : 'Create Menu Item'}</DialogTitle>
            <DialogDescription>
              {menuItem
                ? 'Update the menu item details below'
                : 'Add a new item to your menu'}
            </DialogDescription>
          </DialogHeader>

          {serverError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {serverError}
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="e.g., Ayam Gunting Original"
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  {...register('sku')}
                  placeholder="e.g., AG-001"
                />
                {errors.sku && (
                  <p className="text-sm text-red-500">{errors.sku.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Optional description"
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">
                  Price ($) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  {...register('price', { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {errors.price && (
                  <p className="text-sm text-red-500">{errors.price.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost_price">Cost Price ($)</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  {...register('cost_price', { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {errors.cost_price && (
                  <p className="text-sm text-red-500">{errors.cost_price.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category_id">Category</Label>
              <Select
                value={watch('category_id') || 'none'}
                onValueChange={(value) =>
                  setValue('category_id', value === 'none' ? '' : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {modifierGroups.length > 0 && (
              <div className="space-y-2">
                <Label>Modifier Groups</Label>
                <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                  {modifierGroups.map((group) => (
                    <div key={group.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`modifier-${group.id}`}
                        checked={selectedModifierGroups.includes(group.id)}
                        onCheckedChange={() => handleModifierGroupToggle(group.id)}
                      />
                      <Label
                        htmlFor={`modifier-${group.id}`}
                        className="font-normal cursor-pointer"
                      >
                        {group.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                {...register('sort_order', { valueAsNumber: true })}
                min={0}
              />
              {errors.sort_order && (
                <p className="text-sm text-red-500">{errors.sort_order.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_available">Available</Label>
                <p className="text-sm text-muted-foreground">
                  Unavailable items will be hidden from the menu
                </p>
              </div>
              <Switch
                id="is_available"
                checked={isAvailable}
                onCheckedChange={(checked) => setValue('is_available', checked)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : menuItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
