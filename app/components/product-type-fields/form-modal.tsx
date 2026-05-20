"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import {
  buildProductTypeFieldKey,
  countProductTypeFieldGroups,
  countProductTypeFields,
  createEmptyProductTypeFieldBuilderDocument,
  getGroupById,
  getProductTypeFieldRefId,
  getProductTypeFieldRefName,
  getSectionById,
} from "@/lib/product-type-fields";
import type {
  ProductTypeFieldBuilderDocument,
  ProductTypeFieldBuilderGroup,
  ProductTypeFieldBuilderResponse,
  ProductTypeFieldDefinition,
  ProductTypeFieldMutationResponse,
  ProductTypeFieldRef,
} from "@/types/product-type-fields";
import DynamicFieldBuilderTable from "./dynamic-field-builder-table";
import {
  buildFieldWorkbookTemplateFileName,
  buildProductTypeFieldWorkbookTemplate,
  cleanBuilderForSave,
  fieldsLengthOrZero,
  getErrorMessage,
  hasDuplicateFieldKeys,
  importProductTypeFieldCsvRows,
  insertFieldAfterIndex,
  makeLocalId,
  parseProductTypeFieldWorkbook,
  updateSectionList,
  validateProductTypeFieldBuilder,
  withLocalIds,
} from "./form-modal-utils";
import GroupNameBuilder from "./group-name-builder";
import SectionHeadingSelector from "./section-heading-selector";

type LookupOption = {
  _id: string;
  name: string;
  isActive?: boolean;
  categoryId?: ProductTypeFieldRef;
  subCategoryId?: ProductTypeFieldRef;
  subcategoryId?: ProductTypeFieldRef;
};

function getCategoryIdFromSubcategory(option?: LookupOption | null) {
  if (!option) return "";

  const categoryValue = option.categoryId;

  if (!categoryValue) return "";
  if (typeof categoryValue === "string") return categoryValue;
  return String(categoryValue._id || "");
}

function getSubcategoryIdFromProductType(option?: LookupOption | null) {
  if (!option) return "";

  const subcategoryValue = option.subCategoryId || option.subcategoryId;

  if (!subcategoryValue) return "";
  if (typeof subcategoryValue === "string") return subcategoryValue;
  return String(subcategoryValue._id || "");
}

export default function ProductTypeFieldFormModal({
  mode,
  item,
  categories,
  subcategories,
  productTypes,
  onClose,
  onSuccess,
}: {
  mode: "create" | "edit";
  item: ProductTypeFieldBuilderDocument | null;
  categories: LookupOption[];
  subcategories: LookupOption[];
  productTypes: LookupOption[];
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}) {
  const workbookInputRef = useRef<HTMLInputElement | null>(null);
  const [builder, setBuilder] = useState<ProductTypeFieldBuilderDocument>(() =>
    withLocalIds(item || createEmptyProductTypeFieldBuilderDocument())
  );
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [loadedProductTypeId, setLoadedProductTypeId] = useState("");

  useEffect(() => {
    const nextBuilder = withLocalIds(item || createEmptyProductTypeFieldBuilderDocument());
    setBuilder(nextBuilder);
    setLoadedProductTypeId(getProductTypeFieldRefId(nextBuilder.productTypeId));
    setSelectedSectionId(nextBuilder.sectionHeadings[0]?._id || "");
    setSelectedGroupId(nextBuilder.sectionHeadings[0]?.groups[0]?._id || "");
  }, [item]);

  const selectedCategoryId = getProductTypeFieldRefId(builder.categoryId);
  const selectedSubcategoryId = getProductTypeFieldRefId(builder.subcategoryId);
  const selectedProductTypeId = getProductTypeFieldRefId(builder.productTypeId);

  const filteredSubcategories = useMemo(() => {
    if (!selectedCategoryId) {
      return [];
    }

    return subcategories.filter(
      (option) => getCategoryIdFromSubcategory(option) === selectedCategoryId
    );
  }, [selectedCategoryId, subcategories]);

  const filteredProductTypes = useMemo(() => {
    if (!selectedSubcategoryId) {
      return [];
    }

    return productTypes.filter(
      (option) => getSubcategoryIdFromProductType(option) === selectedSubcategoryId
    );
  }, [productTypes, selectedSubcategoryId]);

  const selectedCategoryName = useMemo(() => {
    const matchedCategory = categories.find((option) => option._id === selectedCategoryId);
    return matchedCategory?.name || getProductTypeFieldRefName(builder.categoryId) || "";
  }, [builder.categoryId, categories, selectedCategoryId]);

  const selectedSubcategoryName = useMemo(() => {
    const matchedSubcategory = subcategories.find(
      (option) => option._id === selectedSubcategoryId
    );
    return (
      matchedSubcategory?.name ||
      getProductTypeFieldRefName(builder.subcategoryId) ||
      ""
    );
  }, [builder.subcategoryId, selectedSubcategoryId, subcategories]);

  const selectedProductTypeName = useMemo(() => {
    const matchedProductType = productTypes.find(
      (option) => option._id === selectedProductTypeId
    );

    return (
      matchedProductType?.name ||
      getProductTypeFieldRefName(builder.productTypeId) ||
      ""
    );
  }, [builder.productTypeId, productTypes, selectedProductTypeId]);

  const selectedSection = getSectionById(builder, selectedSectionId);
  const selectedGroup = getGroupById(selectedSection, selectedGroupId);
  const selectedSectionIndex = selectedSection
    ? builder.sectionHeadings.findIndex((section) => section._id === selectedSection._id) + 1
    : 0;

  const summaryCounts = useMemo(
    () => ({
      sections: builder.sectionHeadings.length,
      groups: countProductTypeFieldGroups(builder),
      fields: countProductTypeFields(builder),
    }),
    [builder]
  );

  const selectedPath = [selectedCategoryName, selectedSubcategoryName, selectedProductTypeName]
    .filter(Boolean)
    .join(" / ");

  const hasSelectedProductType = Boolean(selectedProductTypeId);
  const isBusy = submitting || loadingExisting;
  const selectionLocked = mode === "edit" || isBusy;
  const workspaceStatus = !selectedProductTypeId
    ? "Pick Category -> Subcategory -> Product Type first. Steps 1, 2, and 3 unlock after that."
    : !selectedSection
      ? "Choose a section to begin."
      : !selectedGroup
        ? `Create or select a group inside ${selectedSection.headingName}.`
        : `Editing ${selectedGroup.groupName || "selected group"} inside ${selectedSection.headingName}.`;

  useEffect(() => {
    if (!builder.sectionHeadings.length) {
      setSelectedSectionId("");
      return;
    }

    const section =
      builder.sectionHeadings.find((entry) => entry._id === selectedSectionId) ||
      builder.sectionHeadings[0];

    if (section && section._id !== selectedSectionId) {
      setSelectedSectionId(section._id || "");
    }
  }, [builder.sectionHeadings, selectedSectionId]);

  useEffect(() => {
    const section = getSectionById(builder, selectedSectionId);

    if (!section) {
      setSelectedGroupId("");
      return;
    }

    const group =
      section.groups.find((entry) => entry._id === selectedGroupId) || section.groups[0];

    if (!group) {
      if (selectedGroupId) {
        setSelectedGroupId("");
      }
      return;
    }

    if (group._id !== selectedGroupId) {
      setSelectedGroupId(group._id || "");
    }
  }, [builder, selectedGroupId, selectedSectionId]);

  useEffect(() => {
    if (!selectedProductTypeId) {
      setLoadedProductTypeId("");
      return;
    }

    if (mode === "edit" && selectedProductTypeId === getProductTypeFieldRefId(item?.productTypeId)) {
      return;
    }

    if (selectedProductTypeId === loadedProductTypeId) {
      return;
    }

    let active = true;

    async function hydrateExistingBuilder() {
      try {
        setLoadingExisting(true);

        const response = await apiClient.get<ProductTypeFieldBuilderResponse>(
          SummaryApi.product_type_fields_by_product_type.url(selectedProductTypeId),
          {
            params: {
              includeInactive: "true",
            },
          }
        );

        if (!active) {
          return;
        }

        if (!response.data?.success) {
          throw new Error(
            response.data?.message || "Failed to load Product Type Field Builder"
          );
        }

        const nextDocument = response.data?.data;

        if (nextDocument) {
          const hydrated = withLocalIds(nextDocument);
          setBuilder(hydrated);
          setSelectedSectionId(hydrated.sectionHeadings[0]?._id || "");
          setSelectedGroupId(hydrated.sectionHeadings[0]?.groups[0]?._id || "");
          toast.success(
            `Loaded existing builder for ${
              getProductTypeFieldRefName(hydrated.productTypeId) ||
              "the selected product type"
            }`
          );
        } else {
          setBuilder((prev) =>
            withLocalIds({
              ...createEmptyProductTypeFieldBuilderDocument(),
              categoryId: selectedCategoryId,
              subcategoryId: selectedSubcategoryId,
              productTypeId: selectedProductTypeId,
              isActive: prev.isActive !== false,
            })
          );
        }

        setLoadedProductTypeId(selectedProductTypeId);
      } catch (error: unknown) {
        if (!active) {
          return;
        }

        toast.error(getErrorMessage(error, "Unable to load builder structure"));
      } finally {
        if (active) {
          setLoadingExisting(false);
        }
      }
    }

    void hydrateExistingBuilder();

    return () => {
      active = false;
    };
  }, [
    item,
    loadedProductTypeId,
    mode,
    selectedCategoryId,
    selectedProductTypeId,
    selectedSubcategoryId,
  ]);

  function updateRootRef(
    key: "categoryId" | "subcategoryId" | "productTypeId",
    value: string
  ) {
    setBuilder((prev) =>
      withLocalIds({
        ...prev,
        [key]: value,
      })
    );
  }

  function handleCategoryChange(value: string) {
    setLoadedProductTypeId("");
    setBuilder((prev) =>
      withLocalIds({
        ...prev,
        categoryId: value,
        subcategoryId: "",
        productTypeId: "",
      })
    );
  }

  function handleSubcategoryChange(value: string) {
    setLoadedProductTypeId("");
    setBuilder((prev) =>
      withLocalIds({
        ...prev,
        subcategoryId: value,
        productTypeId: "",
      })
    );
  }

  function handleProductTypeChange(value: string) {
    setLoadedProductTypeId("");
    updateRootRef("productTypeId", value);
  }

  function handleToggleSection(sectionId: string) {
    setBuilder((prev) =>
      updateSectionList(prev, (sections) =>
        sections.map((section) =>
          section._id === sectionId
            ? {
                ...section,
                isActive: section.isActive === false,
              }
            : section
        )
      )
    );
  }

  function handleAddGroup(groupName: string) {
    if (!selectedSection) {
      return;
    }

    const nextGroupId = makeLocalId("group");
    const normalizedGroupName =
      String(groupName || "").trim() || `Group ${selectedSection.groups.length + 1}`;

    setBuilder((prev) =>
      updateSectionList(prev, (sections) =>
        sections.map((section) =>
          section._id === selectedSection._id
            ? {
                ...section,
                groups: [
                  ...section.groups,
                  {
                    _id: nextGroupId,
                    groupName: normalizedGroupName,
                    sortOrder: section.groups.length + 1,
                    isActive: true,
                    fields: [],
                  },
                ],
              }
            : section
        )
      )
    );

    setSelectedGroupId(nextGroupId);
  }

  function handleAddSuggestedGroups(groupNames: string[]) {
    if (!selectedSection || !groupNames.length) {
      return;
    }

    const normalizedRequestedNames = groupNames
      .map((groupName) => String(groupName || "").trim())
      .filter(Boolean);

    if (!normalizedRequestedNames.length) {
      return;
    }

    let firstInsertedGroupId = "";

    setBuilder((prev) =>
      updateSectionList(prev, (sections) =>
        sections.map((section) => {
          if (section._id !== selectedSection._id) {
            return section;
          }

          const existingNames = new Set(
            section.groups.map((group) => group.groupName.trim().toLowerCase())
          );
          const nextGroups = [...section.groups];

          for (const groupName of normalizedRequestedNames) {
            const normalizedName = groupName.toLowerCase();

            if (existingNames.has(normalizedName)) {
              continue;
            }

            const nextGroupId = makeLocalId("group");

            if (!firstInsertedGroupId) {
              firstInsertedGroupId = nextGroupId;
            }

            nextGroups.push({
              _id: nextGroupId,
              groupName,
              sortOrder: nextGroups.length + 1,
              isActive: true,
              fields: [],
            });

            existingNames.add(normalizedName);
          }

          return {
            ...section,
            groups: nextGroups.map((group, index) => ({
              ...group,
              sortOrder: index + 1,
            })),
          };
        })
      )
    );

    if (firstInsertedGroupId) {
      setSelectedGroupId(firstInsertedGroupId);
    }
  }

  function handleRenameGroup(groupId: string, groupName: string) {
    setBuilder((prev) =>
      updateSectionList(prev, (sections) =>
        sections.map((section) => ({
          ...section,
          groups: section.groups.map((group) =>
            group._id === groupId
              ? {
                  ...group,
                  groupName,
                }
              : group
          ),
        }))
      )
    );
  }

  function handleRemoveGroup(groupId: string) {
    setBuilder((prev) =>
      updateSectionList(prev, (sections) =>
        sections.map((section) =>
          section._id === selectedSection?._id
            ? {
                ...section,
                groups: section.groups
                  .filter((group) => group._id !== groupId)
                  .map((group, index) => ({
                    ...group,
                    sortOrder: index + 1,
                  })),
              }
            : section
        )
      )
    );
  }

  function handleToggleGroup(groupId: string) {
    setBuilder((prev) =>
      updateSectionList(prev, (sections) =>
        sections.map((section) => ({
          ...section,
          groups: section.groups.map((group) =>
            group._id === groupId
              ? {
                  ...group,
                  isActive: group.isActive === false,
                }
              : group
          ),
        }))
      )
    );
  }

  function updateGroupFields(
    callback: (group: ProductTypeFieldBuilderGroup) => ProductTypeFieldBuilderGroup
  ) {
    if (!selectedSection || !selectedGroup) {
      return;
    }

    setBuilder((prev) =>
      updateSectionList(prev, (sections) =>
        sections.map((section) =>
          section._id === selectedSection._id
            ? {
                ...section,
                groups: section.groups.map((group) =>
                  group._id === selectedGroup._id ? callback(group) : group
                ),
              }
            : section
        )
      )
    );
  }

  function handleAddField() {
    handleAddFieldAfter(fieldsLengthOrZero(selectedGroup) - 1);
  }

  function handleAddFieldAfter(index: number) {
    if (!selectedGroup) {
      return;
    }

    updateGroupFields((group) => ({
      ...group,
      fields: insertFieldAfterIndex(group.fields, index),
    }));
  }

  function handleChangeField(index: number, nextField: ProductTypeFieldDefinition) {
    updateGroupFields((group) => {
      const currentField = group.fields[index];
      const currentAutoKey = buildProductTypeFieldKey(
        currentField?.key || currentField?.label || ""
      );
      const nextLabel = String(nextField.label || "").trim();
      const nextTypedKey = String(nextField.key || "").trim();
      const shouldAutoUpdateKey =
        !String(currentField?.key || "").trim() ||
        String(currentField?.key || "").trim() === currentAutoKey;

      const normalizedKey = shouldAutoUpdateKey
        ? buildProductTypeFieldKey(nextLabel)
        : buildProductTypeFieldKey(nextTypedKey || currentField.key || nextLabel);

      const updatedField: ProductTypeFieldDefinition = {
        ...currentField,
        ...nextField,
        label: nextLabel,
        key: normalizedKey,
        placeholder: String(nextField.placeholder || "").trim(),
        options: Array.isArray(nextField.options)
          ? nextField.options.map((entry) => entry.trim()).filter(Boolean)
          : [],
        unitOptions: Array.isArray(nextField.unitOptions)
          ? nextField.unitOptions.map((entry) => entry.trim()).filter(Boolean)
          : [],
        sortOrder:
          Number.isFinite(Number(nextField.sortOrder)) && Number(nextField.sortOrder) > 0
            ? Number(nextField.sortOrder)
            : index + 1,
        required: Boolean(nextField.required),
        addMore: Boolean(nextField.addMore),
        hasUnit: Boolean(nextField.hasUnit),
        active: nextField.active !== false,
      };

      return {
        ...group,
        fields: group.fields.map((field, fieldIndex) =>
          fieldIndex === index ? updatedField : field
        ),
      };
    });
  }

  function handleRemoveField(index: number) {
    updateGroupFields((group) => ({
      ...group,
      fields: group.fields
        .filter((_, fieldIndex) => fieldIndex !== index)
        .map((field, fieldIndex) => ({
          ...field,
          sortOrder: fieldIndex + 1,
        })),
    }));
  }

  async function handleDownloadWorkbookTemplate() {
    if (!selectedProductTypeId) {
      toast.error("Select a product type first");
      return;
    }

    const workbookData = await buildProductTypeFieldWorkbookTemplate();
    const fileName = buildFieldWorkbookTemplateFileName({
      productTypeName: selectedProductTypeName,
    });
    const blob = new Blob([workbookData], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);

    toast.success(
      "Workbook template downloaded with Product Details, Images, Variations, Offer, and Safety & Compliance sheets."
    );
  }

  function handleUploadWorkbookClick() {
    if (!selectedProductTypeId) {
      toast.error("Select a product type first");
      return;
    }

    workbookInputRef.current?.click();
  }

  function applyImportedRows(
    rows: Array<Awaited<ReturnType<typeof parseProductTypeFieldWorkbook>>[number]>
  ) {
    const imported = importProductTypeFieldCsvRows({
      builder,
      rows,
    });

    const duplicateKey = hasDuplicateFieldKeys(imported.builder);

    if (duplicateKey) {
      toast.error(
        `Duplicate field key "${duplicateKey}" found in the workbook import inside the same group`
      );
      return;
    }

    if (!imported.importedFieldCount) {
      toast.error("No field rows were imported from the workbook");
      return;
    }

    setBuilder(imported.builder);

    if (imported.lastSectionId) {
      setSelectedSectionId(imported.lastSectionId);
    }

    if (imported.lastGroupId) {
      setSelectedGroupId(imported.lastGroupId);
    }

    toast.success(
      `Imported ${imported.importedFieldCount} field${
        imported.importedFieldCount === 1 ? "" : "s"
      } from workbook`
    );
  }

  async function handleWorkbookFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const rows = await parseProductTypeFieldWorkbook(file);

      if (!rows.length) {
        toast.error("The workbook is empty or has no valid field rows");
        return;
      }

      applyImportedRows(rows);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to import workbook fields"));
    }
  }

  async function handleSubmit() {
    const validationMessage = validateProductTypeFieldBuilder(builder);

    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      setSubmitting(true);

      const payload = cleanBuilderForSave(builder);
      const productTypeId = getProductTypeFieldRefId(builder.productTypeId);
      const useUpdate = Boolean(builder._id) && Boolean(productTypeId);

      const response = useUpdate
        ? await apiClient.put<ProductTypeFieldMutationResponse>(
            SummaryApi.product_type_fields_update.url(productTypeId),
            payload
          )
        : await apiClient.post<ProductTypeFieldMutationResponse>(
            SummaryApi.product_type_fields_create.url,
            payload
          );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to save Product Type Field Builder"
        );
      }

      toast.success(
        response.data?.message || "Product Type Field Builder saved successfully"
      );

      await onSuccess();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to save builder"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex max-h-[90vh] flex-col max-w-12xl ">
      <div className="border-b border-slate-200 bg-white px-5 py-5 md:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-[28px] font-black tracking-tight text-slate-950">
              {mode === "edit" ? "Edit Product Type Fields" : "Create Product Type Fields"}
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
              Use the tables below to choose the section, manage groups, and build
              field rows for the selected product type.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CountBadge label={`${summaryCounts.sections} sections`} />
            <CountBadge label={`${summaryCounts.groups} groups`} />
            <CountBadge label={`${summaryCounts.fields} fields`} accent="primary" />
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 md:px-6">
        <div className="space-y-5">
          <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#00008b]">
                      Builder Context
                    </p>
                    <h3 className="mt-1 text-lg font-black text-slate-950">
                      Choose where this builder belongs
                    </h3>
                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                      Pick the category path and product type that will own this
                      builder document.
                    </p>
                  </div>

                  <label className="inline-flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={builder.isActive !== false}
                      onChange={(event) =>
                        setBuilder((prev) => ({
                          ...prev,
                          isActive: event.target.checked,
                        }))
                      }
                      disabled={submitting}
                      className="h-4 w-4 rounded border-slate-300 text-[#00008b] focus:ring-[#00008b]"
                    />
                    Builder is active
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  <SelectField
                    label="Category"
                    value={selectedCategoryId}
                    disabled={selectionLocked}
                    onChange={handleCategoryChange}
                    options={categories}
                    placeholder="Select category"
                  />

                  <SelectField
                    label="Subcategory"
                    value={selectedSubcategoryId}
                    disabled={selectionLocked || !selectedCategoryId}
                    onChange={handleSubcategoryChange}
                    options={filteredSubcategories}
                    placeholder="Select subcategory"
                  />

                  <SelectField
                    label="Product Type"
                    value={selectedProductTypeId}
                    disabled={selectionLocked || !selectedSubcategoryId}
                    onChange={handleProductTypeChange}
                    options={filteredProductTypes}
                    placeholder="Select product type"
                  />
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                      Current path
                    </p>
                    <p className="mt-1 text-sm font-bold leading-6 text-slate-800">
                      {selectedPath || "No product type selected yet."}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                      Current workspace
                    </p>
                    <p className="mt-1 text-sm font-bold leading-6 text-slate-800">
                      {workspaceStatus}
                    </p>
                  </div>
                </div>

                {mode === "edit" ? (
                  <p className="text-sm font-semibold leading-6 text-slate-500">
                    Product type selection is locked while editing an existing
                    builder.
                  </p>
                ) : null}

                {loadingExisting ? (
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin text-[#00008b]" />
                    Loading existing builder structure...
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {hasSelectedProductType ? (
            <>
              <SectionHeadingSelector
                builder={builder}
                selectedSectionId={selectedSectionId}
                disabled={isBusy}
                onSelect={(sectionId) => {
                  setSelectedSectionId(sectionId);
                  const nextSection = getSectionById(builder, sectionId);
                  setSelectedGroupId(nextSection?.groups[0]?._id || "");
                }}
                onToggle={handleToggleSection}
              />

              <GroupNameBuilder
                section={selectedSection}
                sectionIndex={selectedSectionIndex || 1}
                productTypeName={selectedProductTypeName}
                selectedGroupId={selectedGroupId}
                disabled={isBusy}
                onSelectGroup={setSelectedGroupId}
                onAddGroup={handleAddGroup}
                onAddSuggestedGroups={handleAddSuggestedGroups}
                onRenameGroup={handleRenameGroup}
                onRemoveGroup={handleRemoveGroup}
                onToggleGroup={handleToggleGroup}
              />

              <DynamicFieldBuilderTable
                sectionName={selectedSection?.headingName}
                sectionIndex={selectedSectionIndex || 1}
                groupName={selectedGroup?.groupName}
                fields={selectedGroup?.fields || []}
                sectionSelected={Boolean(selectedSection)}
                groupSelected={Boolean(selectedGroup)}
                disabled={isBusy}
                onAddField={handleAddField}
                onDownloadWorkbookTemplate={() => void handleDownloadWorkbookTemplate()}
                onUploadWorkbook={handleUploadWorkbookClick}
                onChangeField={handleChangeField}
                onRemoveField={handleRemoveField}
              />
            </>
          ) : (
            <section className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80">
              <div className="px-5 py-6">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#00008b]">
                  Next
                </p>
                <h3 className="mt-1 text-lg font-black text-slate-950">
                  Select Product Type To Continue
                </h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Choose Category, Subcategory, and Product Type first. After that,
                  Steps 1, 2, and 3 will appear for sections, groups, and fields.
                </p>
              </div>
            </section>
          )}

          <input
            ref={workbookInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => void handleWorkbookFileSelected(event)}
            className="hidden"
          />
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white px-5 py-4 md:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold leading-6 text-slate-500">
            Saving stores all sections, groups, and fields together for this product
            type.
          </p>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isBusy}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#00008b] px-5 text-sm font-bold text-white transition hover:bg-[#00006f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save builder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CountBadge({
  label,
  accent = "neutral",
}: {
  label: string;
  accent?: "neutral" | "primary";
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${
        accent === "primary"
          ? "border-[#00008b]/15 bg-[#00008b]/5 text-[#00008b]"
          : "border-slate-200 bg-white text-slate-700"
      }`}
    >
      {label}
    </span>
  );
}

function SelectField({
  label,
  value,
  options,
  placeholder,
  disabled = false,
  onChange,
}: {
  label: string;
  value: string;
  options: LookupOption[];
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option._id} value={option._id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}
