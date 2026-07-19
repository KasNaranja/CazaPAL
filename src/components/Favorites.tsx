"use client";

import { ListingCard } from "./ListingCard";
import { EmptyState } from "./States";
import { useFavorites } from "@/lib/useFavorites";
import { totalPrice } from "@/lib/types";

export function Favorites() {
  const { list } = useFavorites();
  // Cheapest first, same as the search view.
  const items = [...list].sort((a, b) => totalPrice(a) - totalPrice(b));

  return (
    <section className="pt-4">
      <h1 className="mb-4 font-display text-2xl text-white sm:text-3xl">
        Favoritos{items.length ? ` (${items.length})` : ""}
      </h1>

      {items.length === 0 ? (
        <div className="pt-8">
          <EmptyState title="Aún no tienes favoritos">
            <p className="text-sm text-texto-3">
              Toca el corazón de un anuncio para guardarlo aquí.
            </p>
          </EmptyState>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((l) => (
            <ListingCard key={`${l.source}-${l.vintedId}`} listing={l} />
          ))}
        </div>
      )}
    </section>
  );
}
