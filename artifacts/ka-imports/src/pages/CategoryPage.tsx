import { useState, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetProducts } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProductCard } from "@/components/product/ProductCard";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLiveTracking } from "@/hooks/useLiveTracking";

export default function CategoryPage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/categoria/:categoryName");
  
  if (!match) {
    return null;
  }

  const categoryName = params?.categoryName ? decodeURIComponent(params.categoryName) : "";
  const { data, isLoading } = useGetProducts();
  
  useLiveTracking("catalog");

  const filteredProducts = useMemo(() => {
    if (!data?.products) return [];
    return data.products.filter((product) => {
      const matches = product.category === categoryName;
      return matches;
    });
  }, [data, categoryName]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao catálogo
          </Button>
        </div>

        {/* Título */}
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold text-foreground">
            {categoryName}
          </h1>
          <p className="text-muted-foreground mt-2">
            {filteredProducts.length} {filteredProducts.length === 1 ? "produto" : "produtos"} encontrado{filteredProducts.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Produtos */}
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-96 text-center">
            <p className="text-lg text-muted-foreground mb-4">Nenhum produto encontrado nesta categoria.</p>
            <Button onClick={() => setLocation("/")} variant="outline">
              Explorar outros produtos
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} priority={false} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
