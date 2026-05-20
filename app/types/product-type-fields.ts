export type ProductTypeFieldInputType =
  | "text"
  | "number"
  | "textarea"
  | "select"
  | "multiSelect"
  | "checkbox"
  | "radio"
  | "date"
  | "file"
  | "boolean";

export type ProductTypeFieldHeadingPreset =
  | "Product Details"
  | "Images"
  | "Variations"
  | "Offer"
  | "Safety & Compliance";

export type ProductTypeFieldRef =
  | string
  | {
      _id?: string;
      name?: string;
      nameKey?: string;
      categoryId?:
        | string
        | {
            _id?: string;
            name?: string;
            nameKey?: string;
          };
      subCategoryId?:
        | string
        | {
            _id?: string;
            name?: string;
            nameKey?: string;
            categoryId?:
              | string
              | {
                  _id?: string;
                  name?: string;
                  nameKey?: string;
                };
          };
    };

export type ProductTypeFieldDefinition = {
  _id?: string;
  label: string;
  key: string;
  inputType: ProductTypeFieldInputType;
  placeholder?: string;
  options?: string[];
  unitOptions?: string[];
  sortOrder: number;
  required: boolean;
  addMore: boolean;
  hasUnit: boolean;
  active: boolean;
};

export type ProductTypeFieldBuilderGroup = {
  _id?: string;
  groupName: string;
  sortOrder: number;
  isActive: boolean;
  fields: ProductTypeFieldDefinition[];
};

export type ProductTypeFieldBuilderSection = {
  _id?: string;
  headingName: string;
  sortOrder: number;
  isActive: boolean;
  groups: ProductTypeFieldBuilderGroup[];
};

export type ProductTypeFieldBuilderDocument = {
  _id?: string;
  productTypeId?: ProductTypeFieldRef;
  categoryId?: ProductTypeFieldRef;
  subcategoryId?: ProductTypeFieldRef;
  sectionHeadings: ProductTypeFieldBuilderSection[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type DynamicProductFileValue = {
  url?: string;
  publicId?: string;
  fileName?: string;
  mimeType?: string;
  file?: File | null;
};

export type DynamicProductPrimitiveValue = string | number | boolean;

export type DynamicProductUnitValue = {
  value: DynamicProductPrimitiveValue;
  unit?: string;
};

export type DynamicProductVariationMatrixCellValue =
  | DynamicProductPrimitiveValue
  | DynamicProductUnitValue;

export type DynamicProductVariationMatrixStatus =
  | "AVAILABLE"
  | "OUT_OF_STOCK"
  | "INACTIVE";

export type DynamicProductVariationMatrixRow = {
  comboKey: string;
  dimensions: Record<string, DynamicProductVariationMatrixCellValue>;
  values: Record<string, DynamicProductPrimitiveValue>;
  mainImage?: DynamicProductFileValue | null;
  status?: DynamicProductVariationMatrixStatus;
  details?: string;
};

export type DynamicProductFieldStoredValue =
  | DynamicProductPrimitiveValue
  | DynamicProductFileValue
  | DynamicProductPrimitiveValue[]
  | DynamicProductUnitValue[]
  | DynamicProductFileValue[]
  | DynamicProductVariationMatrixRow[];

export type DynamicProductFieldValueEntry = {
  fieldId?: string;
  label: string;
  key: string;
  value: DynamicProductFieldStoredValue;
  unit?: string;
};

export type DynamicProductFieldValueGroup = {
  groupId?: string;
  groupName: string;
  fields: DynamicProductFieldValueEntry[];
};

export type DynamicProductFieldValueSection = {
  sectionHeadingId?: string;
  sectionHeadingName: string;
  groups: DynamicProductFieldValueGroup[];
};

export type DynamicProductFieldValues = DynamicProductFieldValueSection[];

export type ProductTypeFieldListResponse = {
  success?: boolean;
  message?: string;
  data?: ProductTypeFieldBuilderDocument[];
};

export type ProductTypeFieldBuilderResponse = {
  success?: boolean;
  message?: string;
  data?: ProductTypeFieldBuilderDocument | null;
};

export type ProductTypeFieldMutationResponse = {
  success?: boolean;
  message?: string;
  data?: ProductTypeFieldBuilderDocument | null;
};
