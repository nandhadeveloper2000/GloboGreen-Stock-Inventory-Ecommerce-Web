/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  PackagePlus,
  Save,
  Search,
  Sparkles,
  Store,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

import type {
  ApiResponse,
  FormState,
  ProductCatalogItem,
  ShopProductItem,
  VariantEntryFormState,
  VendorItem,
} from "./features/shop-products/create/types";

import { INITIAL_FORM } from "./features/shop-products/create/constants";

import {
  buildPricePreview,
  clampPercent,
  getPricingValidationMessage,
  toNumber,
} from "./features/shop-products/create/pricing";

import {
  buildCreateFormState,
  mergeVariantEntryState,
} from "./features/shop-products/create/form-state";

import {
  FieldInput,
  FieldLabel,
  MainUnitSelect,
} from "./features/shop-products/create/components/FormFields";

import {
  ProductPricingTable,
  VariantPricingTable,
} from "./features/shop-products/create/components/PricingTables";

import { readSelectedShop } from "./features/shop-products/create/selected-shop";

import {
  formatDateInput,
  getCatalogProductLabel,
  getErrorMessage,
  getProductEntryShopLabel,
  getProductId,
  getProductImage,
  getVariantProductImage,
  getVendorName,
  isProductEntryAllowedShop,
  isVariantProduct,
  normalizePricingTypeForShop,
  normalizeRole,
  normalizeValue,
} from "./features/shop-products/create/utils";

export default function CreateMyShopProductPage({
  mode = "create",
  productId = "",
}: {
  mode?: "create" | "edit";
  productId?: string;
}) {
  const router = useRouter();
  const { accessToken, role } = useAuth();

  const currentRole = useMemo(() => normalizeRole(role), [role]);
  const isEditMode = mode === "edit";

  const canManage = useMemo(
    () =>
      currentRole === "SHOP_OWNER" ||
      currentRole === "SHOP_MANAGER" ||
      currentRole === "SHOP_SUPERVISOR",
    [currentRole]
  );

  const listHref = useMemo(() => {
    if (currentRole === "SHOP_MANAGER") return "/shopmanager/myshoppage/list";
    if (currentRole === "SHOP_SUPERVISOR") return "/shopsupervisor/myshoppage/list";
    return "/shopowner/myshoppage/list";
  }, [currentRole]);

  const vendorCreateHref = useMemo(() => {
    if (currentRole === "SHOP_MANAGER") return "/shopmanager/vendors/create";
    if (currentRole === "SHOP_SUPERVISOR") return "/shopsupervisor/vendors/create";
    return "/shopowner/vendors/create";
  }, [currentRole]);

  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");
  const [selectedShopType, setSelectedShopType] = useState("");

  const [catalogItems, setCatalogItems] = useState<ProductCatalogItem[]>([]);
  const [shopProducts, setShopProducts] = useState<ShopProductItem[]>([]);
  const [existingItem, setExistingItem] = useState<ShopProductItem | null>(null);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const [globalVendors, setGlobalVendors] = useState<VendorItem[]>([]);
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorLoading, setVendorLoading] = useState(false);
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const productEntryShopSelected = useMemo(
    () => isProductEntryAllowedShop(selectedShopType),
    [selectedShopType]
  );

  const selectedShopTypeLabel = useMemo(
    () => getProductEntryShopLabel(selectedShopType),
    [selectedShopType]
  );

  const isWholesaleShop = useMemo(
    () => normalizeValue(selectedShopType) === "WHOLESALE_SHOP",
    [selectedShopType]
  );

  const selectedCatalogProduct = useMemo(
    () => catalogItems.find((item) => String(item._id) === String(form.productId)) || null,
    [catalogItems, form.productId]
  );

  const selectedProductUsesVariants = useMemo(
    () =>
      isVariantProduct(selectedCatalogProduct) ||
      Boolean(existingItem?.variantEntries?.length),
    [existingItem?.variantEntries?.length, selectedCatalogProduct]
  );

  const vendorOptions = useMemo(() => {
    return [...globalVendors]
      .filter((vendor) => String(vendor.status || "ACTIVE").toUpperCase() === "ACTIVE")
      .sort((a, b) => getVendorName(a).localeCompare(getVendorName(b)));
  }, [globalVendors]);

  const selectedVendor = useMemo(() => {
    return (
      vendorOptions.find((vendor) => String(vendor._id) === String(form.vendorId)) ||
      null
    );
  }, [form.vendorId, vendorOptions]);

  const filteredVendorOptions = useMemo(() => {
    const search = vendorSearch.trim().toLowerCase();

    if (!search) return vendorOptions;

    return vendorOptions.filter((vendor) =>
      [vendor.vendorName, vendor.vendorKey, vendor.name, vendor.code]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [vendorOptions, vendorSearch]);

  const currentPricingType = useMemo(
    () => normalizePricingTypeForShop(selectedShopType, form.pricingType),
    [form.pricingType, selectedShopType]
  );

  const singlePreview = useMemo(
    () =>
      buildPricePreview({
        pricingType: "SINGLE",
        purchaseQtyValue: form.purchaseQty || form.minQty,
        mrpPriceValue: form.mrpPrice,
        inputPriceValue: form.inputPrice,
        marginValue: form.baseRangeDownPercent,
        negotiationValue: form.rangeDownPercent,
      }),
    [
      form.baseRangeDownPercent,
      form.inputPrice,
      form.minQty,
      form.mrpPrice,
      form.purchaseQty,
      form.rangeDownPercent,
    ]
  );

  const bulkPreview = useMemo(
    () =>
      buildPricePreview({
        pricingType: "BULK",
        purchaseQtyValue: form.bulkPurchaseQty || form.bulkMinQty,
        mrpPriceValue: form.bulkMrpPrice,
        inputPriceValue: form.bulkInputPrice,
        marginValue: form.bulkBaseRangeDownPercent,
        negotiationValue: form.bulkRangeDownPercent,
      }),
    [
      form.bulkBaseRangeDownPercent,
      form.bulkInputPrice,
      form.bulkMinQty,
      form.bulkMrpPrice,
      form.bulkPurchaseQty,
      form.bulkRangeDownPercent,
    ]
  );

  const selectedVariantCount = useMemo(
    () => form.variantEntries.filter((entry) => entry.isSelected).length,
    [form.variantEntries]
  );

  const syncSelectedShop = useCallback(() => {
    const selectedShop = readSelectedShop();

    setSelectedShopId(selectedShop.id);
    setSelectedShopName(selectedShop.name);
    setSelectedShopType(selectedShop.type);
  }, []);

  const loadVendors = useCallback(
    async (q = "") => {
      if (!accessToken || !selectedShopId) {
        setGlobalVendors([]);
        return;
      }

      try {
        setVendorLoading(true);

        const endpoint = SummaryApi.vendors.listByShop(selectedShopId);
        const query = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";

        const response = await fetch(`${baseURL}${endpoint.url}${query}`, {
          method: endpoint.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          credentials: "include",
          cache: "no-store",
        });

        const result = (await response
          .json()
          .catch(() => ({}))) as ApiResponse<VendorItem[]>;

        if (!response.ok || !result?.success) {
          throw new Error(getErrorMessage(result, "Failed to load vendors"));
        }

        setGlobalVendors(Array.isArray(result.data) ? result.data : []);
      } catch (error) {
        setGlobalVendors([]);
        toast.error(error instanceof Error ? error.message : "Failed to load vendors");
      } finally {
        setVendorLoading(false);
      }
    },
    [accessToken, selectedShopId]
  );

  const loadPageData = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setCatalogItems([]);
      setShopProducts([]);
      return;
    }

    if (!selectedShopId || !productEntryShopSelected) {
      setLoading(false);
      setCatalogItems([]);
      setShopProducts([]);
      setExistingItem(null);
      setErrorMessage("");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const [catalogResponse, shopProductsResponse] = await Promise.all([
        fetch(
          `${baseURL}${SummaryApi.shop_product_available_list.url(
            selectedShopId,
            isEditMode && productId ? { includeProductId: productId } : undefined
          )}`,
          {
            method: SummaryApi.shop_product_available_list.method,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
            credentials: "include",
            cache: "no-store",
          }
        ),
        fetch(`${baseURL}${SummaryApi.shop_product_list.url(selectedShopId)}`, {
          method: SummaryApi.shop_product_list.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      const catalogResult = (await catalogResponse
        .json()
        .catch(() => ({}))) as ApiResponse<ProductCatalogItem[]>;

      const shopProductsResult = (await shopProductsResponse
        .json()
        .catch(() => ({}))) as ApiResponse<ShopProductItem[]>;

      if (!catalogResponse.ok || !catalogResult?.success) {
        throw new Error(
          getErrorMessage(catalogResult, "Failed to load available products")
        );
      }

      if (!shopProductsResponse.ok || !shopProductsResult?.success) {
        throw new Error(
          getErrorMessage(shopProductsResult, "Failed to load shop products")
        );
      }

      const eligibleProducts = Array.isArray(catalogResult.data)
        ? catalogResult.data
        : [];

      const mappedProducts = Array.isArray(shopProductsResult.data)
        ? shopProductsResult.data
        : [];

      setCatalogItems(eligibleProducts);
      setShopProducts(mappedProducts);

      if (isEditMode) {
        const matchedItem =
          mappedProducts.find(
            (item) =>
              String(getProductId(item)) === String(productId) ||
              String(item._id) === String(productId)
          ) || null;

        if (!matchedItem) {
          setExistingItem(null);
          setErrorMessage("Selected shop product was not found.");
          return;
        }

        const matchedProduct =
          eligibleProducts.find(
            (item) => String(item._id) === String(getProductId(matchedItem))
          ) || null;

        const nextVariantEntries = isVariantProduct(matchedProduct)
          ? mergeVariantEntryState(
              matchedProduct,
              matchedItem.variantEntries || [],
              []
            )
          : [];

        const singlePricing = matchedItem.singlePricing || null;
        const bulkPricing = matchedItem.bulkPricing || null;

        setExistingItem(matchedItem);

        setForm({
          productId: getProductId(matchedItem),
          vendorId:
            typeof matchedItem.vendorId === "string"
              ? matchedItem.vendorId
              : String(matchedItem.vendorId?._id || ""),
          pricingType: normalizePricingTypeForShop(
            selectedShopType,
            matchedItem.pricingType
          ),
          mainUnit: String(matchedItem.mainUnit || "Pcs"),
          qty: String(matchedItem.qty ?? 0),
          lowStockQty: String(matchedItem.lowStockQty ?? 0),
          minQty: String(singlePricing?.minQty ?? matchedItem.minQty ?? 0),
          purchaseQty: String(
            singlePricing?.purchaseQty ??
              matchedItem.purchaseQty ??
              singlePricing?.minQty ??
              matchedItem.minQty ??
              0
          ),
          inputPrice: String(singlePricing?.inputPrice ?? matchedItem.inputPrice ?? ""),
          mrpPrice: String(
            singlePricing?.mrpPrice ??
              matchedItem.mrpPrice ??
              singlePricing?.maxSellingPrice ??
              matchedItem.maxSellingPrice ??
              ""
          ),
          baseRangeDownPercent: String(
            singlePricing?.baseRangeDownPercent ??
              matchedItem.baseRangeDownPercent ??
              10
          ),
          rangeDownPercent: String(
            singlePricing?.discount?.rangeDownPercent ??
              matchedItem.discount?.rangeDownPercent ??
              singlePricing?.rangeDownPercent ??
              matchedItem.rangeDownPercent ??
              0
          ),
          warrantyMonths: String(matchedItem.warrantyMonths ?? 0),
          purchaseDate: formatDateInput(matchedItem.purchaseDate),
          expiryDate: formatDateInput(matchedItem.expiryDate),
          discountFromDate: formatDateInput(
            singlePricing?.discount?.fromDate ?? matchedItem.discount?.fromDate
          ),
          discountToDate: formatDateInput(
            singlePricing?.discount?.toDate ?? matchedItem.discount?.toDate
          ),
          bulkMinQty: String(bulkPricing?.minQty ?? 0),
          bulkPurchaseQty: String(
            bulkPricing?.purchaseQty ?? bulkPricing?.minQty ?? 0
          ),
          bulkInputPrice: String(bulkPricing?.inputPrice ?? ""),
          bulkMrpPrice: String(
            bulkPricing?.mrpPrice ??
              bulkPricing?.maxSellingPrice ??
              bulkPricing?.inputPrice ??
              ""
          ),
          bulkBaseRangeDownPercent: String(
            bulkPricing?.baseRangeDownPercent ?? 10
          ),
          bulkRangeDownPercent: String(
            bulkPricing?.discount?.rangeDownPercent ??
              bulkPricing?.rangeDownPercent ??
              0
          ),
          bulkDiscountFromDate: formatDateInput(bulkPricing?.discount?.fromDate),
          bulkDiscountToDate: formatDateInput(bulkPricing?.discount?.toDate),
          variantEntries: nextVariantEntries,
        });

        if (matchedItem.vendorId && typeof matchedItem.vendorId !== "string") {
          setVendorSearch(getVendorName(matchedItem.vendorId));
        } else {
          setVendorSearch("");
        }

        return;
      }

      const mappedProductIds = new Set(
        mappedProducts.map((item) => getProductId(item)).filter(Boolean)
      );

      const nextAvailableProduct =
        eligibleProducts.find((item) => !mappedProductIds.has(item._id)) ||
        eligibleProducts[0] ||
        null;

      setExistingItem(null);
      setForm(buildCreateFormState(nextAvailableProduct));
      setVendorSearch("");
    } catch (error) {
      setCatalogItems([]);
      setShopProducts([]);
      setExistingItem(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load page data"
      );
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    isEditMode,
    productId,
    selectedShopId,
    selectedShopType,
    productEntryShopSelected,
  ]);

  useEffect(() => {
    syncSelectedShop();

    function handleShopChange() {
      syncSelectedShop();
    }

    window.addEventListener("shop-selection-changed", handleShopChange);
    window.addEventListener("storage", handleShopChange);

    return () => {
      window.removeEventListener("shop-selection-changed", handleShopChange);
      window.removeEventListener("storage", handleShopChange);
    };
  }, [syncSelectedShop]);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  useEffect(() => {
    if (!selectedShopId || !productEntryShopSelected) return;

    const timer = window.setTimeout(() => {
      void loadVendors(vendorSearch);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [loadVendors, selectedShopId, vendorSearch, productEntryShopSelected]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement | null;

      if (!target?.closest("[data-vendor-combobox='true']")) {
        setVendorDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const updateSingleField = useCallback((key: keyof FormState, value: string) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }, []);

  const updateVariantEntry = useCallback(
    (variantIndex: number, patch: Partial<VariantEntryFormState>) => {
      setForm((previous) => ({
        ...previous,
        variantEntries: previous.variantEntries.map((entry) =>
          entry.variantIndex === variantIndex ? { ...entry, ...patch } : entry
        ),
      }));
    },
    []
  );

  const handleProductSelection = useCallback(
    (nextProductId: string) => {
      const product =
        catalogItems.find((item) => String(item._id) === String(nextProductId)) ||
        null;

      setExistingItem(null);
      setForm((previous) => ({
        ...buildCreateFormState(product),
        vendorId: previous.vendorId,
      }));
    },
    [catalogItems]
  );

  const handleSelectVendor = useCallback(
    (vendorId: string) => {
      const vendor =
        vendorOptions.find((item) => String(item._id) === String(vendorId)) ||
        null;

      setForm((previous) => ({
        ...previous,
        vendorId,
      }));

      setVendorSearch(vendor ? getVendorName(vendor) : "");
      setVendorDropdownOpen(false);
    },
    [vendorOptions]
  );

  function buildVariantSinglePreview(entry: VariantEntryFormState) {
    return buildPricePreview({
      pricingType: "SINGLE",
      purchaseQtyValue: entry.purchaseQty || entry.minQty,
      mrpPriceValue: entry.mrpPrice,
      inputPriceValue: entry.inputPrice,
      marginValue: entry.baseRangeDownPercent,
      negotiationValue: entry.rangeDownPercent,
    });
  }

  function buildVariantBulkPreview(entry: VariantEntryFormState) {
    return buildPricePreview({
      pricingType: "BULK",
      purchaseQtyValue: entry.bulkPurchaseQty || entry.bulkMinQty,
      mrpPriceValue: entry.bulkMrpPrice,
      inputPriceValue: entry.bulkInputPrice,
      marginValue: entry.bulkBaseRangeDownPercent,
      negotiationValue: entry.bulkRangeDownPercent,
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      toast.error("Unauthorized. Please login again.");
      return;
    }

    if (!canManage) {
      toast.error("You do not have permission to manage shop products.");
      return;
    }

    if (!selectedShopId || !productEntryShopSelected) {
      toast.error("Please select a valid Warehouse Retail Shop or Wholesale Shop.");
      return;
    }

    if (!form.productId) {
      toast.error("Please select a product.");
      return;
    }

    if (!form.vendorId) {
      toast.error("Please select a vendor.");
      return;
    }

    const targetProductId = isEditMode
      ? getProductId(existingItem) || form.productId || productId
      : form.productId;

    if (!targetProductId) {
      toast.error("Product id is missing.");
      return;
    }

    const selectedVariantEntries = selectedProductUsesVariants
      ? form.variantEntries.filter((entry) => entry.isSelected)
      : [];

    if (selectedProductUsesVariants && selectedVariantEntries.length === 0) {
      toast.error("Select at least one variant.");
      return;
    }

    if (selectedProductUsesVariants) {
      for (const entry of selectedVariantEntries) {
        const label = entry.title || `Variant ${entry.variantIndex + 1}`;

        const singlePricingMessage = getPricingValidationMessage({
          label: `${label} single pricing`,
          pricingType: "SINGLE",
          purchaseQtyValue: entry.purchaseQty || entry.minQty,
          inputPriceValue: entry.inputPrice,
          mrpPriceValue: entry.mrpPrice,
          marginValue: entry.baseRangeDownPercent,
          negotiationValue: entry.rangeDownPercent,
        });

        if (singlePricingMessage) {
          toast.error(singlePricingMessage);
          return;
        }

        if (isWholesaleShop) {
          const bulkPricingMessage = getPricingValidationMessage({
            label: `${label} bulk pricing`,
            pricingType: "BULK",
            purchaseQtyValue: entry.bulkPurchaseQty || entry.bulkMinQty,
            inputPriceValue: entry.bulkInputPrice,
            mrpPriceValue: entry.bulkMrpPrice,
            marginValue: entry.bulkBaseRangeDownPercent,
            negotiationValue: entry.bulkRangeDownPercent,
          });

          if (bulkPricingMessage) {
            toast.error(bulkPricingMessage);
            return;
          }
        }
      }
    } else {
      const pricingMessage = getPricingValidationMessage({
        label: "this product",
        pricingType: "SINGLE",
        purchaseQtyValue: form.purchaseQty || form.minQty,
        inputPriceValue: form.inputPrice,
        mrpPriceValue: form.mrpPrice,
        marginValue: form.baseRangeDownPercent,
        negotiationValue: form.rangeDownPercent,
      });

      if (pricingMessage) {
        toast.error(pricingMessage);
        return;
      }

      if (isWholesaleShop) {
        const bulkPricingMessage = getPricingValidationMessage({
          label: "bulk product purchase",
          pricingType: "BULK",
          purchaseQtyValue: form.bulkPurchaseQty || form.bulkMinQty,
          inputPriceValue: form.bulkInputPrice,
          mrpPriceValue: form.bulkMrpPrice,
          marginValue: form.bulkBaseRangeDownPercent,
          negotiationValue: form.bulkRangeDownPercent,
        });

        if (bulkPricingMessage) {
          toast.error(bulkPricingMessage);
          return;
        }
      }
    }

    const payload = selectedProductUsesVariants
      ? {
          ...(isEditMode ? {} : { productId: form.productId }),
          vendorId: form.vendorId,
          pricingType: currentPricingType,
          images: selectedCatalogProduct?.images || [],
          variantEntries: selectedVariantEntries.map((entry) => {
            const singleEntryPreview = buildVariantSinglePreview(entry);
            const bulkEntryPreview = buildVariantBulkPreview(entry);

            return {
              variantIndex: entry.variantIndex,
              title: entry.title,
              attributes: entry.attributes,
              isActive: true,
              pricingType: currentPricingType,
              mainUnit: entry.mainUnit || "Pcs",

              qty: toNumber(entry.qty, 0),
              lowStockQty: toNumber(entry.lowStockQty, 0),
              minQty: toNumber(entry.minQty, 0),
              purchaseQty: toNumber(entry.purchaseQty || entry.minQty, 0),

              inputPrice: toNumber(entry.inputPrice, 0),
              mrpPrice: toNumber(entry.mrpPrice, 0),
              baseRangeDownPercent: clampPercent(
                toNumber(entry.baseRangeDownPercent, 10),
                10
              ),
              rangeDownPercent: clampPercent(
                toNumber(entry.rangeDownPercent, 0),
                0
              ),

              warrantyMonths: toNumber(entry.warrantyMonths, 0),
              purchaseDate: entry.purchaseDate || null,
              expiryDate: entry.expiryDate || null,

              singlePricing: {
                pricingType: "SINGLE",
                minQty: toNumber(entry.minQty, 0),
                purchaseQty: toNumber(entry.purchaseQty || entry.minQty, 0),
                inputPrice: toNumber(entry.inputPrice, 0),
                mrpPrice: toNumber(entry.mrpPrice, 0),
                baseRangeDownPercent: clampPercent(
                  toNumber(entry.baseRangeDownPercent, 10),
                  10
                ),
                rangeDownPercent: clampPercent(
                  toNumber(entry.rangeDownPercent, 0),
                  0
                ),
                marginAmount: singleEntryPreview.marginAmount,
                marginPrice: singleEntryPreview.marginPrice,
                unitSellingPrice: singleEntryPreview.unitSellingPrice,
                totalPurchasePrice: singleEntryPreview.totalPurchasePrice,
                negotiationAmount: singleEntryPreview.negotiationAmount,
                minSellingPrice: singleEntryPreview.minSellingPrice,
                maxSellingPrice: singleEntryPreview.maxSellingPrice,
                sellingPrice: singleEntryPreview.sellingPrice,
                discount: {
                  rangeDownPercent: clampPercent(
                    toNumber(entry.rangeDownPercent, 0),
                    0
                  ),
                  fromDate: entry.discountFromDate || null,
                  toDate: entry.discountToDate || null,
                },
              },

              ...(isWholesaleShop
                ? {
                    bulkPricing: {
                      pricingType: "BULK",
                      minQty: toNumber(entry.bulkMinQty, 0),
                      purchaseQty: toNumber(
                        entry.bulkPurchaseQty || entry.bulkMinQty,
                        0
                      ),
                      inputPrice: toNumber(entry.bulkInputPrice, 0),
                      mrpPrice: toNumber(entry.bulkMrpPrice, 0),
                      baseRangeDownPercent: clampPercent(
                        toNumber(entry.bulkBaseRangeDownPercent, 10),
                        10
                      ),
                      rangeDownPercent: clampPercent(
                        toNumber(entry.bulkRangeDownPercent, 0),
                        0
                      ),
                      marginAmount: bulkEntryPreview.marginAmount,
                      marginPrice: bulkEntryPreview.marginPrice,
                      unitSellingPrice: bulkEntryPreview.unitSellingPrice,
                      totalPurchasePrice: bulkEntryPreview.totalPurchasePrice,
                      negotiationAmount: bulkEntryPreview.negotiationAmount,
                      minSellingPrice: bulkEntryPreview.minSellingPrice,
                      maxSellingPrice: bulkEntryPreview.maxSellingPrice,
                      sellingPrice: bulkEntryPreview.sellingPrice,
                      discount: {
                        rangeDownPercent: clampPercent(
                          toNumber(entry.bulkRangeDownPercent, 0),
                          0
                        ),
                        fromDate: entry.bulkDiscountFromDate || null,
                        toDate: entry.bulkDiscountToDate || null,
                      },
                    },
                  }
                : {}),

              discount: {
                rangeDownPercent: clampPercent(
                  toNumber(entry.rangeDownPercent, 0),
                  0
                ),
                fromDate: entry.discountFromDate || null,
                toDate: entry.discountToDate || null,
              },
            };
          }),
        }
      : {
          ...(isEditMode ? {} : { productId: form.productId }),
          vendorId: form.vendorId,
          pricingType: currentPricingType,
          images: selectedCatalogProduct?.images || [],

          mainUnit: form.mainUnit || "Pcs",

          qty: toNumber(form.qty, 0),
          lowStockQty: toNumber(form.lowStockQty, 0),
          minQty: toNumber(form.minQty, 0),
          purchaseQty: toNumber(form.purchaseQty || form.minQty, 0),

          inputPrice: toNumber(form.inputPrice, 0),
          mrpPrice: toNumber(form.mrpPrice, 0),
          baseRangeDownPercent: clampPercent(
            toNumber(form.baseRangeDownPercent, 10),
            10
          ),
          rangeDownPercent: clampPercent(toNumber(form.rangeDownPercent, 0), 0),

          warrantyMonths: toNumber(form.warrantyMonths, 0),
          purchaseDate: form.purchaseDate || null,
          expiryDate: form.expiryDate || null,

          singlePricing: {
            pricingType: "SINGLE",
            minQty: toNumber(form.minQty, 0),
            purchaseQty: toNumber(form.purchaseQty || form.minQty, 0),
            inputPrice: toNumber(form.inputPrice, 0),
            mrpPrice: toNumber(form.mrpPrice, 0),
            baseRangeDownPercent: clampPercent(
              toNumber(form.baseRangeDownPercent, 10),
              10
            ),
            rangeDownPercent: clampPercent(
              toNumber(form.rangeDownPercent, 0),
              0
            ),
            marginAmount: singlePreview.marginAmount,
            marginPrice: singlePreview.marginPrice,
            unitSellingPrice: singlePreview.unitSellingPrice,
            totalPurchasePrice: singlePreview.totalPurchasePrice,
            negotiationAmount: singlePreview.negotiationAmount,
            minSellingPrice: singlePreview.minSellingPrice,
            maxSellingPrice: singlePreview.maxSellingPrice,
            sellingPrice: singlePreview.sellingPrice,
            discount: {
              rangeDownPercent: clampPercent(
                toNumber(form.rangeDownPercent, 0),
                0
              ),
              fromDate: form.discountFromDate || null,
              toDate: form.discountToDate || null,
            },
          },

          ...(isWholesaleShop
            ? {
                bulkPricing: {
                  pricingType: "BULK",
                  minQty: toNumber(form.bulkMinQty, 0),
                  purchaseQty: toNumber(
                    form.bulkPurchaseQty || form.bulkMinQty,
                    0
                  ),
                  inputPrice: toNumber(form.bulkInputPrice, 0),
                  mrpPrice: toNumber(form.bulkMrpPrice, 0),
                  baseRangeDownPercent: clampPercent(
                    toNumber(form.bulkBaseRangeDownPercent, 10),
                    10
                  ),
                  rangeDownPercent: clampPercent(
                    toNumber(form.bulkRangeDownPercent, 0),
                    0
                  ),
                  marginAmount: bulkPreview.marginAmount,
                  marginPrice: bulkPreview.marginPrice,
                  unitSellingPrice: bulkPreview.unitSellingPrice,
                  totalPurchasePrice: bulkPreview.totalPurchasePrice,
                  negotiationAmount: bulkPreview.negotiationAmount,
                  minSellingPrice: bulkPreview.minSellingPrice,
                  maxSellingPrice: bulkPreview.maxSellingPrice,
                  sellingPrice: bulkPreview.sellingPrice,
                  discount: {
                    rangeDownPercent: clampPercent(
                      toNumber(form.bulkRangeDownPercent, 0),
                      0
                    ),
                    fromDate: form.bulkDiscountFromDate || null,
                    toDate: form.bulkDiscountToDate || null,
                  },
                },
              }
            : {}),

          discount: {
            rangeDownPercent: clampPercent(
              toNumber(form.rangeDownPercent, 0),
              0
            ),
            fromDate: form.discountFromDate || null,
            toDate: form.discountToDate || null,
          },
        };

    try {
      setSubmitting(true);

      const endpoint = isEditMode
        ? SummaryApi.shop_product_update.url(selectedShopId, targetProductId)
        : SummaryApi.shop_product_create.url(selectedShopId);

      const method = isEditMode
        ? SummaryApi.shop_product_update.method
        : SummaryApi.shop_product_create.method;

      const response = await fetch(`${baseURL}${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      const result = (await response
        .json()
        .catch(() => ({}))) as ApiResponse<ShopProductItem>;

      if (!response.ok || !result?.success) {
        throw new Error(
          getErrorMessage(
            result,
            isEditMode
              ? "Failed to update shop product"
              : "Failed to add shop product"
          )
        );
      }

      toast.success(
        isEditMode
          ? "Shop product updated successfully"
          : "Shop product added successfully"
      );

      router.push(listHref);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save shop product"
      );
    } finally {
      setSubmitting(false);
    }
  }

  const disabledForm =
    loading || submitting || !canManage || !productEntryShopSelected;

  const selectedProductImage = getProductImage(selectedCatalogProduct);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
          <span className="text-sm font-semibold text-slate-700">
            Loading shop product form.
          </span>
        </div>
      </div>
    );
  }

  if (!productEntryShopSelected) {
    return (
      <div className="rounded-card border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-1 h-5 w-5 text-amber-700" />
          <div>
            <h2 className="text-lg font-bold text-white">
              Product entry not available
            </h2>
            <p className="mt-1 text-sm text-amber-800">
              Only Warehouse Retail Shop or Wholesale Shop can add shop products.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="product-create-form-compact space-y-5"
    >
      <div className="relative overflow-hidden rounded-card bg-gradient-hero p-5 text-white shadow-[0_24px_70px_rgba(46,49,146,0.28)]">
        <div className="premium-grid-bg" />
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white/80">
              <Sparkles className="h-3.5 w-3.5" />
              My Shop Product
            </div>

            <h1 className="mt-4 text-2xl font-black tracking-tight md:text-4xl text-white">
              {isEditMode ? "Edit Shop Product" : "Add Shop Product"}
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-white/75">
              {selectedShopName || "Selected shop"} · {selectedShopTypeLabel}
            </p>
          </div>

          <Link
            href={listHref}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to List
          </Link>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!canManage ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          Your role can view shop products, but cannot create or update them.
        </div>
      ) : null}

      <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-[16px] font-black text-slate-950">
              <PackagePlus className="h-4 w-4 text-violet-700" />
              Product Selection
            </h2>
            <p className="mt-1 text-[12px] font-medium text-slate-500">
              Select product and vendor for current shop stock.
            </p>
          </div>

          <div className="hidden rounded-2xl border border-violet-100 bg-violet-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-violet-700 sm:block">
            {isWholesaleShop ? "Single + Bulk" : "Single"}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div>
            <FieldLabel htmlFor="productId" label="Product Name" />
            <select
              id="productId"
              value={form.productId}
              disabled={disabledForm || isEditMode}
              onChange={(event) => handleProductSelection(event.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-fuchsia-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">Select product</option>
              {catalogItems.map((item) => (
                <option key={item._id} value={item._id}>
                  {getCatalogProductLabel(item)}
                </option>
              ))}
            </select>
          </div>

          <div data-vendor-combobox="true" className="relative">
            <FieldLabel htmlFor="vendorSearch" label="Vendor" />
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="vendorSearch"
                value={vendorSearch}
                disabled={disabledForm}
                onFocus={() => setVendorDropdownOpen(true)}
                onChange={(event) => {
                  setVendorSearch(event.target.value);
                  setVendorDropdownOpen(true);
                }}
                placeholder="Search vendor."
                className="premium-input pl-10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>

            {selectedVendor ? (
              <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                Selected: {getVendorName(selectedVendor)}
              </p>
            ) : null}

            {vendorDropdownOpen ? (
              <div className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                {vendorLoading ? (
                  <div className="flex items-center gap-2 p-3 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading vendors...
                  </div>
                ) : filteredVendorOptions.length ? (
                  filteredVendorOptions.map((vendor) => (
                    <button
                      key={vendor._id}
                      type="button"
                      onClick={() => handleSelectVendor(vendor._id)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <span>{getVendorName(vendor)}</span>
                      {form.vendorId === vendor._id ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : null}
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-sm text-slate-500">
                    No vendor found.{" "}
                    <Link href={vendorCreateHref} className="font-bold text-violet-700">
                      Create vendor
                    </Link>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {selectedCatalogProduct ? (
          <div className="mt-5 flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="h-16 w-16 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {selectedProductImage ? (
                <img
                  src={selectedProductImage}
                  alt={getCatalogProductLabel(selectedCatalogProduct)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-slate-400">
                  No Image
                </div>
              )}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-950">
                {getCatalogProductLabel(selectedCatalogProduct)}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {selectedProductUsesVariants
                  ? `${form.variantEntries.length} variants available`
                  : "Single product stock"}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      {!selectedProductUsesVariants ? (
        <>
          <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <div className="mb-4">
              <h2 className="flex items-center gap-2 text-[16px] font-black text-slate-950">
                <Store className="h-4 w-4 text-violet-700" />
                Stock Details
              </h2>
              <p className="mt-1 text-[12px] font-medium text-slate-500">
                Main unit, available quantity, low stock alert, warranty and dates.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <FieldLabel htmlFor="mainUnit" label="Main Unit" />
                <MainUnitSelect
                  id="mainUnit"
                  value={form.mainUnit}
                  disabled={disabledForm}
                  onChange={(value) => updateSingleField("mainUnit", value)}
                />
              </div>

              <div>
                <FieldLabel htmlFor="qty" label="Available Stock Qty" />
                <FieldInput
                  id="qty"
                  type="number"
                  min={0}
                  value={form.qty}
                  disabled={disabledForm}
                  onChange={(value) => updateSingleField("qty", value)}
                />
              </div>

              <div>
                <FieldLabel htmlFor="lowStockQty" label="Low Stock Qty" />
                <FieldInput
                  id="lowStockQty"
                  type="number"
                  min={0}
                  value={form.lowStockQty}
                  disabled={disabledForm}
                  onChange={(value) => updateSingleField("lowStockQty", value)}
                />
              </div>

              <div>
                <FieldLabel htmlFor="warrantyMonths" label="Warranty Months" />
                <FieldInput
                  id="warrantyMonths"
                  type="number"
                  min={0}
                  value={form.warrantyMonths}
                  disabled={disabledForm}
                  onChange={(value) => updateSingleField("warrantyMonths", value)}
                />
              </div>

              <div>
                <FieldLabel htmlFor="purchaseDate" label="Purchase Date" />
                <FieldInput
                  id="purchaseDate"
                  type="date"
                  value={form.purchaseDate}
                  disabled={disabledForm}
                  onChange={(value) => updateSingleField("purchaseDate", value)}
                />
              </div>

              <div>
                <FieldLabel htmlFor="expiryDate" label="Expiry Date" />
                <FieldInput
                  id="expiryDate"
                  type="date"
                  value={form.expiryDate}
                  disabled={disabledForm}
                  onChange={(value) => updateSingleField("expiryDate", value)}
                />
              </div>

              <div>
                <FieldLabel htmlFor="discountFromDate" label="Discount From" />
                <FieldInput
                  id="discountFromDate"
                  type="date"
                  value={form.discountFromDate}
                  disabled={disabledForm}
                  onChange={(value) => updateSingleField("discountFromDate", value)}
                />
              </div>

              <div>
                <FieldLabel htmlFor="discountToDate" label="Discount To" />
                <FieldInput
                  id="discountToDate"
                  type="date"
                  value={form.discountToDate}
                  disabled={disabledForm}
                  onChange={(value) => updateSingleField("discountToDate", value)}
                />
              </div>
            </div>
          </section>

          <ProductPricingTable
            form={form}
            singlePreview={singlePreview}
            bulkPreview={bulkPreview}
            isWholesaleShop={isWholesaleShop}
            disabledForm={disabledForm}
            updateSingleField={updateSingleField}
          />
        </>
      ) : (
        <section className="space-y-4">
          <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-[16px] font-black text-slate-950">
                  Variant Stock & Pricing
                </h2>
                <p className="mt-1 text-[12px] font-medium text-slate-500">
                  Select variants and enter stock with single pricing. Wholesale shop also supports bulk pricing.
                </p>
              </div>

              <div className="rounded-2xl border border-violet-100 bg-violet-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-violet-700">
                Selected {selectedVariantCount}
              </div>
            </div>
          </div>

          {form.variantEntries.map((entry) => {
            const variantImage = getVariantProductImage(
              selectedCatalogProduct,
              entry.variantIndex
            );

            const variantSinglePreview = buildVariantSinglePreview(entry);
            const variantBulkPreview = buildVariantBulkPreview(entry);

            return (
              <div
                key={entry.variantIndex}
                className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
              >
                <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      {variantImage ? (
                        <img
                          src={variantImage}
                          alt={entry.title || "Variant"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-slate-400">
                          No Image
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <label className="inline-flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={entry.isSelected}
                          disabled={disabledForm}
                          onChange={(event) =>
                            updateVariantEntry(entry.variantIndex, {
                              isSelected: event.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-slate-300 text-violet-700 focus:ring-violet-200"
                        />
                        <span className="text-sm font-black text-slate-950">
                          {entry.title || `Variant ${entry.variantIndex + 1}`}
                        </span>
                      </label>

                      {entry.attributes.length ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {entry.attributes.map((attribute, index) => (
                            <span
                              key={`${attribute.label}-${attribute.value}-${index}`}
                              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-600"
                            >
                              {attribute.label}: {attribute.value}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div>
                      <FieldLabel
                        htmlFor={`variant-${entry.variantIndex}-mainUnit`}
                        label="Main Unit"
                      />
                      <MainUnitSelect
                        id={`variant-${entry.variantIndex}-mainUnit`}
                        value={entry.mainUnit}
                        disabled={disabledForm || !entry.isSelected}
                        onChange={(value) =>
                          updateVariantEntry(entry.variantIndex, {
                            mainUnit: value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <FieldLabel
                        htmlFor={`variant-${entry.variantIndex}-qty`}
                        label="Available Qty"
                      />
                      <FieldInput
                        id={`variant-${entry.variantIndex}-qty`}
                        type="number"
                        min={0}
                        value={entry.qty}
                        disabled={disabledForm || !entry.isSelected}
                        onChange={(value) =>
                          updateVariantEntry(entry.variantIndex, {
                            qty: value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <FieldLabel
                        htmlFor={`variant-${entry.variantIndex}-lowStock`}
                        label="Low Stock Qty"
                      />
                      <FieldInput
                        id={`variant-${entry.variantIndex}-lowStock`}
                        type="number"
                        min={0}
                        value={entry.lowStockQty}
                        disabled={disabledForm || !entry.isSelected}
                        onChange={(value) =>
                          updateVariantEntry(entry.variantIndex, {
                            lowStockQty: value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <FieldLabel
                        htmlFor={`variant-${entry.variantIndex}-warranty`}
                        label="Warranty Months"
                      />
                      <FieldInput
                        id={`variant-${entry.variantIndex}-warranty`}
                        type="number"
                        min={0}
                        value={entry.warrantyMonths}
                        disabled={disabledForm || !entry.isSelected}
                        onChange={(value) =>
                          updateVariantEntry(entry.variantIndex, {
                            warrantyMonths: value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div>
                    <FieldLabel
                      htmlFor={`variant-${entry.variantIndex}-purchaseDate`}
                      label="Purchase Date"
                    />
                    <FieldInput
                      id={`variant-${entry.variantIndex}-purchaseDate`}
                      type="date"
                      value={entry.purchaseDate}
                      disabled={disabledForm || !entry.isSelected}
                      onChange={(value) =>
                        updateVariantEntry(entry.variantIndex, {
                          purchaseDate: value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <FieldLabel
                      htmlFor={`variant-${entry.variantIndex}-expiryDate`}
                      label="Expiry Date"
                    />
                    <FieldInput
                      id={`variant-${entry.variantIndex}-expiryDate`}
                      type="date"
                      value={entry.expiryDate}
                      disabled={disabledForm || !entry.isSelected}
                      onChange={(value) =>
                        updateVariantEntry(entry.variantIndex, {
                          expiryDate: value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <FieldLabel
                      htmlFor={`variant-${entry.variantIndex}-discountFromDate`}
                      label="Discount From"
                    />
                    <FieldInput
                      id={`variant-${entry.variantIndex}-discountFromDate`}
                      type="date"
                      value={entry.discountFromDate}
                      disabled={disabledForm || !entry.isSelected}
                      onChange={(value) =>
                        updateVariantEntry(entry.variantIndex, {
                          discountFromDate: value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <FieldLabel
                      htmlFor={`variant-${entry.variantIndex}-discountToDate`}
                      label="Discount To"
                    />
                    <FieldInput
                      id={`variant-${entry.variantIndex}-discountToDate`}
                      type="date"
                      value={entry.discountToDate}
                      disabled={disabledForm || !entry.isSelected}
                      onChange={(value) =>
                        updateVariantEntry(entry.variantIndex, {
                          discountToDate: value,
                        })
                      }
                    />
                  </div>
                </div>

                <VariantPricingTable
                  entry={entry}
                  singlePreview={variantSinglePreview}
                  bulkPreview={variantBulkPreview}
                  isWholesaleShop={isWholesaleShop}
                  disabledForm={disabledForm}
                  updateVariantEntry={updateVariantEntry}
                />
              </div>
            );
          })}
        </section>
      )}

      <div className="sticky bottom-4 z-20 rounded-[20px] border border-white/70 bg-white/90 p-3 shadow-[0_14px_35px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-500">
            <Store className="h-4 w-4 text-violet-600" />
            Save product stock and pricing for the selected shop.
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={listHref}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </Link>

            <button
              type="submit"
              disabled={disabledForm}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 text-[13px] font-black text-white shadow-[0_12px_28px_rgba(236,6,119,0.22)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isEditMode ? "Update Product" : "Save Product"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}