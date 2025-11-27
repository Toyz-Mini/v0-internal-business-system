'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Plus, Pencil, Trash2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MenuItemDialog } from '@/components/admin/menu/menu-item-dialog';
import { DeleteMenuItemDialog } from '@/components/admin/menu/delete-menu-item-dialog';
import { toast } from 'sonner';

interface MenuItem {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  cost_price: number;
  image_url: string | null;
  sku: string | null;
  is_available: boolean;
  sort_order: number;
}

interface Category {
  id: string;
  name: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MenuItemsPage() {
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');

  const { data: itemsData, error: itemsError, isLoading: itemsLoading, mutate } = useSWR<{
    success: boolean;
    data: MenuItem[];
  }>(
    filterCategoryId === 'all'
      ? '/api/menu-items'
      : `/api/menu-items?categoryId=${filterCategoryId}`,
    fetcher
  );

  const { data: categoriesData } = useSWR<{
    success: boolean;
    data: Category[];
  }>('/api/menu-categories', fetcher);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null);

  const handleCreateItem = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDeleteItem = (item: MenuItem) => {
    setDeletingItem(item);
  };

  const handleToggleAvailable = async (item: MenuItem) => {
    const optimisticData = itemsData?.data.map((i) =>
      i.id === item.id ? { ...i, is_available: !i.is_available } : i
    );

    mutate(
      { success: true, data: optimisticData || [] },
      {
        optimisticData: { success: true, data: optimisticData || [] },
        rollbackOnError: true,
        revalidate: false,
      }
    );

    try {
      const response = await fetch(`/api/menu-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: !item.is_available }),
      });

      if (!response.ok) {
        throw new Error('Failed to update menu item');
      }

      toast.success(`Menu item ${!item.is_available ? 'activated' : 'deactivated'}`, {
        action: {
          label: 'Undo',
          onClick: () => handleToggleAvailable({ ...item, is_available: !item.is_available }),
        },
      });

      mutate();
    } catch (error) {
      toast.error('Failed to update menu item');
      mutate();
    }
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return '-';
    const category = categoriesData?.data.find((c) => c.id === categoryId);
    return category?.name || '-';
  };

  if (itemsError) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">Failed to load menu items. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const items = itemsData?.data || [];
  const categories = categoriesData?.data || [];

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Menu Items</h1>
          <p className="text-muted-foreground mt-2">
            Manage your menu items, prices, and availability
          </p>
        </div>
        <Button onClick={handleCreateItem}>
          <Plus className="w-4 h-4 mr-2" />
          New Menu Item
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Menu Items</CardTitle>
              <CardDescription>
                {items.length} {items.length === 1 ? 'item' : 'items'} total
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {itemsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {filterCategoryId === 'all'
                  ? 'No menu items yet'
                  : 'No menu items in this category'}
              </p>
              <Button onClick={handleCreateItem} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create your first menu item
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.sku || '-'}
                    </TableCell>
                    <TableCell>{getCategoryName(item.category_id)}</TableCell>
                    <TableCell className="font-medium">
                      ${item.price.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={item.is_available ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => handleToggleAvailable(item)}
                      >
                        {item.is_available ? 'Available' : 'Unavailable'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditItem(item)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteItem(item)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <MenuItemDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        menuItem={editingItem}
        categories={categories}
        onSuccess={() => {
          mutate();
          setIsDialogOpen(false);
        }}
      />

      <DeleteMenuItemDialog
        open={!!deletingItem}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        menuItem={deletingItem}
        onSuccess={() => {
          mutate();
          setDeletingItem(null);
        }}
      />
    </div>
  );
}
