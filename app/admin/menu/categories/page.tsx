'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Plus, Pencil, Trash2 } from 'lucide-react';
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
import { CategoryDialog } from '@/components/admin/menu/category-dialog';
import { DeleteCategoryDialog } from '@/components/admin/menu/delete-category-dialog';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MenuCategoriesPage() {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean;
    data: Category[];
  }>('/api/menu-categories', fetcher);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setIsDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setIsDialogOpen(true);
  };

  const handleDeleteCategory = (category: Category) => {
    setDeletingCategory(category);
  };

  const handleToggleActive = async (category: Category) => {
    const optimisticData = data?.data.map((c) =>
      c.id === category.id ? { ...c, is_active: !c.is_active } : c
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
      const response = await fetch(`/api/menu-categories/${category.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !category.is_active }),
      });

      if (!response.ok) {
        throw new Error('Failed to update category');
      }

      toast.success(`Category ${!category.is_active ? 'activated' : 'deactivated'}`, {
        action: {
          label: 'Undo',
          onClick: () => handleToggleActive({ ...category, is_active: !category.is_active }),
        },
      });

      mutate();
    } catch (error) {
      toast.error('Failed to update category');
      mutate();
    }
  };

  if (error) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">Failed to load categories. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categories = data?.data || [];

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Menu Categories</h1>
          <p className="text-muted-foreground mt-2">
            Manage your menu categories and organize your items
          </p>
        </div>
        <Button onClick={handleCreateCategory}>
          <Plus className="w-4 h-4 mr-2" />
          New Category
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>
            {categories.length} {categories.length === 1 ? 'category' : 'categories'} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No categories yet</p>
              <Button onClick={handleCreateCategory} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create your first category
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {category.description || '-'}
                    </TableCell>
                    <TableCell>{category.sort_order}</TableCell>
                    <TableCell>
                      <Badge
                        variant={category.is_active ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => handleToggleActive(category)}
                      >
                        {category.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditCategory(category)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCategory(category)}
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

      <CategoryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        category={editingCategory}
        onSuccess={() => {
          mutate();
          setIsDialogOpen(false);
        }}
      />

      <DeleteCategoryDialog
        open={!!deletingCategory}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
        category={deletingCategory}
        onSuccess={() => {
          mutate();
          setDeletingCategory(null);
        }}
      />
    </div>
  );
}
