import type { ComponentType } from "react";

export type OptionItem = {
  _id: string;
  id?: string;
  name: string;
  nameKey?: string;
  isActive?: boolean;
};

export type ModelItem = {
  _id: string;
  id?: string;
  name: string;
  nameKey?: string;
  isActive?: boolean;
  brandId?:
    | string
    | {
        _id?: string;
        name?: string;
      };
};

export type ProductMediaItem = {
  id: string;
  file?: File | null;
  previewUrl: string;
  name: string;
  size: number;
  publicId?: string;
  isExisting?: boolean;
};

export type ProductImageItem = ProductMediaItem;
export type ProductVideoItem = ProductMediaItem;

export type CategoryMappingMode =
  | "variant"
  | "variantCompatibility"
  | "productMediaInfoCompatibility"
  | "productMediaInfo";

export type ProductPresetSection = {
  title: string;
  fieldLabels: string[];
};

export type ProductInformationField = {
  label: string;
  value: string;
};

export type ProductInformationSection = {
  title: string;
  fields: ProductInformationField[];
};

export type ProductPresetDefinition = {
  variantLabels: string[];
  sections: ProductPresetSection[];
};

export type ResolvedProductTypePreset = ProductPresetDefinition & {
  itemTypeName: string;
};

export type CompatibilityTableRow = {
  rowId: string;
  brandId: string;
  enabled: boolean;
  modelId: string[];
  notes: string;
  isActive: boolean;
};

export type VariantAttribute = {
  id: string;
  label: string;
  value: string;
};

export type VariantItem = {
  id: string;
  title: string;
  attributes: VariantAttribute[];
  images: ProductImageItem[];
  videos: ProductVideoItem[];
  productInformation: ProductInformationSection[];
  isActive: boolean;
};

export type ProductPayload = {
  configurationMode: CategoryMappingMode;
  itemName: string;
  itemModelNumber: string;
  itemKey: string;
  searchKeys: string[];
  masterCategoryId: string;
  categoryId: string;
  subcategoryId: string;
  productTypeId: string;
  brandId: string;
  modelId: string;
  images: Array<{
    url: string;
    publicId?: string;
  }>;
  videos: Array<{
    url: string;
    publicId?: string;
  }>;
  compatible: Array<{
    brandId: string;
    modelId: string[];
    notes: string;
    isActive: boolean;
  }>;
  variant: Array<{
    title: string;
    attributes: Array<{
      label: string;
      value: string;
    }>;
    images: Array<{
      url: string;
      publicId?: string;
    }>;
    videos: Array<{
      url: string;
      publicId?: string;
    }>;
    productInformation: Array<{
      title: string;
      fields: Array<{
        label: string;
        value: string;
      }>;
    }>;
    isActive: boolean;
  }>;
  productInformation: Array<{
    title: string;
    fields: Array<{
      label: string;
      value: string;
    }>;
  }>;
  isActive: boolean;
};

export type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  categories?: T;
  masterCategories?: T;
  productTypes?: T;
  brands?: T;
  models?: T;
};

export type DropdownConfig = {
  key:
    | "masterCategoryId"
    | "categoryId"
    | "subcategoryId"
    | "productTypeId"
    | "brandId"
    | "modelId";
  label: string;
  placeholder: string;
  icon: ComponentType<{ className?: string }>;
  options: OptionItem[];
  value: string;
  search: string;
  open: boolean;
  loading: boolean;
  disabled?: boolean;
};

export type SearchableSelectOption = {
  _id: string;
  name: string;
  subtitle?: string;
};

export type PresetValueOption = {
  value: string;
  label: string;
  swatch?: string;
};

export type ModelCheckboxSelectorProps = {
  options: SearchableSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  emptyText: string;
  allLabel: string;
};

export type VariantImageGroupPayload = {
  variantIndex: number;
  imageField: string;
  fileNames: string[];
};

export type VariantVideoGroupPayload = {
  variantIndex: number;
  videoField: string;
  fileNames: string[];
};

export type ProductImageGroupPayload = {
  imageField: string;
  fileNames: string[];
};

export type ProductVideoGroupPayload = {
  videoField: string;
  fileNames: string[];
};
