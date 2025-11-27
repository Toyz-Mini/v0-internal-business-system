"use client"

import { useState } from "react"
import { ProductGrid } from "./product-grid"
import { Cart } from "./cart"
import { OrderHistory } from "./order-history"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ArrowLeft, Search, Clock, History, ShoppingCart, Menu, User } from "lucide-react"
import Link from "next/link"
import type { Category, Product, ModifierGroup, Customer, CartItem } from "@/lib/types"

interface POSLayoutProps {
  userRole: string
  userName: string
  userId?: string
  categories: Category[]
  products: Product[]
  modifierGroups: ModifierGroup[]
  customers: Customer[]
}

export function POSLayout({
  userRole,
  userName,
  userId,
  categories,
  products,
  modifierGroups,
  customers,
}: POSLayoutProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showOrderHistory, setShowOrderHistory] = useState(false)
  const [mobileCartOpen, setMobileCartOpen] = useState(false)

  const filteredProducts = products.filter((p) => {
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const addToCart = (product: Product, modifiers: { name: string; price: number }[] = []) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && JSON.stringify(item.modifiers) === JSON.stringify(modifiers),
      )

      if (existingIndex > -1) {
        const updated = [...prev]
        updated[existingIndex].quantity += 1
        return updated
      }

      return [...prev, { product, quantity: 1, modifiers }]
    })
  }

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((_, i) => i !== index))
    } else {
      setCart((prev) => {
        const updated = [...prev]
        updated[index].quantity = quantity
        return updated
      })
    }
  }

  const removeItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index))
  }

  const updateItemNotes = (index: number, notes: string) => {
    setCart((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], notes }
      return updated
    })
  }

  const updateItemDiscount = (index: number, type: "percentage" | "fixed" | null, value: number) => {
    setCart((prev) => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        discount_type: type || undefined,
        discount_amount: value || undefined,
      }
      return updated
    })
  }

  const clearCart = () => {
    setCart([])
    setSelectedCustomer(null)
  }

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cart.reduce((sum, item) => {
    const modifierTotal = item.modifiers.reduce((m, mod) => m + mod.price, 0)
    const baseTotal = (item.product.price + modifierTotal) * item.quantity
    if (item.discount_type === "percentage") {
      return sum + baseTotal * (1 - (item.discount_amount || 0) / 100)
    } else if (item.discount_type === "fixed") {
      return sum + Math.max(0, baseTotal - (item.discount_amount || 0))
    }
    return sum + baseTotal
  }, 0)

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Categories (Desktop) */}
      <aside className="hidden lg:flex w-20 flex-col border-r bg-muted/30">
        {/* Back Button */}
        <div className="p-2 border-b">
          <Button variant="ghost" size="icon" className="w-full h-12" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        </div>

        {/* Category Buttons */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`w-full p-3 rounded-xl text-xs font-medium transition-all flex flex-col items-center gap-1 ${
              selectedCategory === null
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-background hover:bg-muted"
            }`}
          >
            <span className="text-lg">🍽️</span>
            <span>Semua</span>
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`w-full p-3 rounded-xl text-xs font-medium transition-all flex flex-col items-center gap-1 ${
                selectedCategory === category.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-background hover:bg-muted"
              }`}
            >
              <span className="text-lg">
                {category.name === "Ayam"
                  ? "🍗"
                  : category.name === "Minuman"
                    ? "🥤"
                    : category.name === "Set Combo"
                      ? "🍱"
                      : category.name === "Tambahan"
                        ? "🍟"
                        : "📦"}
              </span>
              <span className="line-clamp-2 text-center">{category.name}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header Bar */}
        <header className="h-16 border-b bg-background px-4 flex items-center justify-between gap-4">
          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="p-4 border-b">
                <h2 className="font-semibold">Kategori</h2>
              </div>
              <div className="p-2 space-y-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full p-3 rounded-lg text-left text-sm font-medium transition-all flex items-center gap-3 ${
                    selectedCategory === null ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  <span className="text-lg">🍽️</span>
                  <span>Semua</span>
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full p-3 rounded-lg text-left text-sm font-medium transition-all flex items-center gap-3 ${
                      selectedCategory === category.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                  >
                    <span className="text-lg">
                      {category.name === "Ayam"
                        ? "🍗"
                        : category.name === "Minuman"
                          ? "🥤"
                          : category.name === "Set Combo"
                            ? "🍱"
                            : category.name === "Tambahan"
                              ? "🍟"
                              : "📦"}
                    </span>
                    <span>{category.name}</span>
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop Back Button */}
          <Button variant="ghost" size="icon" className="hidden lg:flex" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>

          {/* Search Bar */}
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2">
            {/* Shift Status */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-600 rounded-full text-xs font-medium">
              <Clock className="h-3.5 w-3.5" />
              <span>Shift Aktif</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex gap-2 bg-transparent"
              onClick={() => setShowOrderHistory(true)}
            >
              <History className="h-4 w-4" />
              <span className="hidden md:inline">Sejarah</span>
            </Button>

            {/* New Order Button */}
            <Button size="sm" onClick={clearCart} className="gap-2">
              <span className="hidden sm:inline">Order Baru</span>
              <span className="sm:hidden">Baru</span>
            </Button>

            {/* Cashier Info */}
            <div className="hidden md:flex items-center gap-2 pl-3 border-l">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="text-sm">
                <p className="font-medium line-clamp-1">{userName}</p>
                <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
              </div>
            </div>

            {/* Mobile Cart Button */}
            <Sheet open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden relative bg-transparent">
                  <ShoppingCart className="h-5 w-5" />
                  {cartItemCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {cartItemCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md p-0">
                <Cart
                  items={cart}
                  customers={customers}
                  selectedCustomer={selectedCustomer}
                  onSelectCustomer={setSelectedCustomer}
                  onUpdateQuantity={updateQuantity}
                  onRemoveItem={removeItem}
                  onUpdateItemNotes={updateItemNotes}
                  onUpdateItemDiscount={updateItemDiscount}
                  onClearCart={clearCart}
                  cashierId={userId}
                  onOrderComplete={() => setMobileCartOpen(false)}
                />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <div className="lg:hidden flex gap-2 overflow-x-auto border-b bg-muted/30 p-2 scrollbar-hide sticky top-0 z-10">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedCategory === null ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
            }`}
          >
            Semua
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === category.id ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3 md:p-4">
          <ProductGrid products={filteredProducts} modifierGroups={modifierGroups} onAddToCart={addToCart} />
        </div>

        <div className="lg:hidden border-t bg-background p-2 safe-area-pb">
          {cart.length === 0 ? (
            <Button className="w-full h-16 text-base gap-3 font-semibold bg-transparent" variant="outline" disabled>
              <ShoppingCart className="h-5 w-5" />
              <span>Cart Kosong</span>
            </Button>
          ) : (
            <Button
              className="w-full h-16 text-lg gap-3 font-semibold bg-primary hover:bg-primary/90"
              onClick={() => setMobileCartOpen(true)}
            >
              <ShoppingCart className="h-6 w-6" />
              <span>Lihat Cart</span>
              <Badge variant="secondary" className="ml-auto bg-white/20 text-white border-0 text-sm px-3 py-1">
                {cartItemCount} item - BND {cartTotal.toFixed(2)}
              </Badge>
            </Button>
          )}
        </div>
      </main>

      {/* Right Panel - Cart (Desktop) */}
      <aside className="hidden lg:flex w-96 border-l bg-background flex-col">
        <Cart
          items={cart}
          customers={customers}
          selectedCustomer={selectedCustomer}
          onSelectCustomer={setSelectedCustomer}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeItem}
          onUpdateItemNotes={updateItemNotes}
          onUpdateItemDiscount={updateItemDiscount}
          onClearCart={clearCart}
          cashierId={userId}
        />
      </aside>

      <OrderHistory
        open={showOrderHistory}
        onOpenChange={setShowOrderHistory}
        userId={userId}
        userRole={userRole}
        voidWindowMinutes={10}
      />
    </div>
  )
}
