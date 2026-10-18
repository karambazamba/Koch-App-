"use client";

import { useState } from "react";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { CARD, CARD_LIST, INPUT_BASE, PAGE_MAIN, SECTION_TITLE, SUBTLE, buttonClass, chipClass } from "@/components/ui/styles";
import { SHOP_SUGGESTIONS, addShop, removeProduct, removeShop, setProduct, useShoppingSettings } from "@/lib/shoppingList";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** /profil/produkte: "Eure Produkte" (Zutat → euer Produkt) und eigene Läden */
export function ProductsView() {
  const settings = useShoppingSettings();
  const [ingredient, setIngredient] = useState("");
  const [product, setProductName] = useState("");
  const [shop, setShop] = useState("");
  if (!settings) return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  const products = Object.entries(settings.products).sort(([a], [b]) => a.localeCompare(b, "de"));

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Eure Produkte" backHref="/profil" />
      <main className={PAGE_MAIN}>
        <p className={SUBTLE}>
          Statt der Zutat aus dem Rezept steht euer Produkt auf der Einkaufsliste – z. B. Alsan statt Butter. Die Rezepte bleiben,
          wie sie sind. Entsteht auch beim Umbenennen auf der Liste („Immer so?“) oder im Chat.
        </p>
        {products.length === 0 ? (
          <p className={`${CARD} p-4 text-muted`}>Noch keine eigenen Produkte.</p>
        ) : (
          <ul className={CARD_LIST}>
            {products.map(([from, to]) => (
              <li key={from} className="flex min-h-12 items-center gap-2 px-4 py-2">
                <span className="text-muted">{cap(from)}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-stone-400" strokeWidth={2} aria-hidden />
                <span className="min-w-0 flex-1 truncate font-semibold">{to}</span>
                <button
                  type="button"
                  onClick={() => removeProduct(from)}
                  aria-label={`${to} statt ${cap(from)} entfernen`}
                  className="flex h-10 w-10 items-center justify-center text-stone-400"
                >
                  <Trash2 className="h-5 w-5" strokeWidth={2} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          className={`${CARD} flex flex-col gap-2 p-4`}
          onSubmit={(e) => {
            e.preventDefault();
            setProduct(ingredient, product);
            setIngredient("");
            setProductName("");
          }}
        >
          <div className="flex items-center gap-2">
            <input value={ingredient} onChange={(e) => setIngredient(e.target.value)} placeholder="Zutat, z. B. Butter" aria-label="Zutat" className={`${INPUT_BASE} h-12 min-w-0 flex-1 px-3`} />
            <ArrowRight className="h-4 w-4 shrink-0 text-stone-400" strokeWidth={2} aria-hidden />
            <input value={product} onChange={(e) => setProductName(e.target.value)} placeholder="Euer Produkt" aria-label="Euer Produkt" className={`${INPUT_BASE} h-12 min-w-0 flex-1 px-3`} />
          </div>
          <button type="submit" disabled={!ingredient.trim() || !product.trim()} className={buttonClass("primary")}>
            <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            Hinzufügen
          </button>
        </form>

        <h2 className={SECTION_TITLE}>Eure Läden</h2>
        <div className="flex flex-wrap gap-2">
          {SHOP_SUGGESTIONS.map((s) => (
            <span key={s} className={chipClass(false, "muted")}>
              {s}
            </span>
          ))}
          {settings.shops.map((s) => (
            <span key={s} className={`${chipClass(true)} pr-1`}>
              {s}
              <button type="button" onClick={() => removeShop(s)} aria-label={`Laden ${s} entfernen`} className="flex h-6 w-6 items-center justify-center">
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              </button>
            </span>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addShop(shop);
            setShop("");
          }}
        >
          <input value={shop} onChange={(e) => setShop(e.target.value)} placeholder="z. B. Hofladen" aria-label="Neuer Laden" className={`${INPUT_BASE} h-12 min-w-0 flex-1 px-4`} />
          <button type="submit" disabled={!shop.trim()} className={buttonClass("secondary")}>
            <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            Laden
          </button>
        </form>
      </main>
    </div>
  );
}
