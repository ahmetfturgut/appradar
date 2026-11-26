"use client";
import { createContext, useContext } from "react";
import type { Catalog } from "../lib/live-catalog";

const Context = createContext<Catalog | null>(null);
export function CatalogProvider({ catalog, children }: { catalog: Catalog; children: React.ReactNode }) { return <Context.Provider value={catalog}>{children}</Context.Provider>; }
export function useCatalog() { const value = useContext(Context); if (!value) throw new Error("catalog_provider_missing"); return value; }
