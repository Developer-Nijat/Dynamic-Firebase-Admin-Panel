import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import dayjs from "dayjs";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  getCountFromServer,
  startAfter,
  writeBatch,
} from "firebase/firestore";
import {
  PlusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
// CUSTOM IMPORTS
import { db } from "../config/firebase";
import { buttonClasses, inputClasses } from "../constants/styleClasses";
import CustomPagination from "../components/CustomPagination";

const ITEMS_PER_PAGE = 10;

export default function CollectionView() {
  const { collectionId } = useParams();
  const [collectionData, setCollectionData] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [filters, setFilters] = useState({});
  const [totalItems, setTotalItems] = useState(0);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [lastDocs, setLastDocs] = useState({});
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);

  useEffect(() => {
    fetchCollectionData();
  }, [collectionId]);

  useEffect(() => {
    if (collectionData) {
      fetchItems();
    }
  }, [collectionData, sortField, sortDirection, filters]);

  useEffect(() => {
    // Reset pagination when sort, filters, or itemsPerPage change
    setCurrentPage(1);
    setLastDocs({});
    fetchItems();
  }, [sortField, sortDirection, filters, itemsPerPage]);

  const fetchCollectionData = async () => {
    try {
      const docRef = doc(db, "collections", collectionId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCollectionData(docSnap.data());
      } else {
        toast.error("Collection not found");
      }
    } catch (error) {
      toast.error("Failed to fetch collection data");
      console.error("Error fetching collection data:", error);
    }
  };

  const fetchItems = async (page = 1) => {
    if (!collectionData) return;

    try {
      setLoading(true);
      const itemsRef = collection(db, collectionId);
      let q = query(
        itemsRef,
        orderBy(sortField, sortDirection),
        limit(itemsPerPage)
      );

      // If not on first page, use the last document from previous page
      if (page > 1 && lastDocs[page - 1]) {
        q = query(
          itemsRef,
          orderBy(sortField, sortDirection),
          startAfter(lastDocs[page - 1]),
          limit(itemsPerPage)
        );
      }

      const itemsSnapshot = await getDocs(q);
      let itemsList = itemsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Apply filters in memory
      if (Object.keys(filters).length > 0) {
        itemsList = itemsList.filter((item) =>
          Object.entries(filters).every(([field, value]) => {
            if (!value) return true;

            if (field === "createdAt" || field === "updatedAt") {
              const itemDate = dayjs(item[field]).format("YYYY-MM-DD");
              return itemDate === value;
            }

            return String(item[field])
              .toLowerCase()
              .includes(String(value).toLowerCase());
          })
        );
      }

      // Store the last document for this page
      const lastVisible = itemsSnapshot.docs[itemsSnapshot.docs.length - 1];
      setLastDocs((prev) => ({
        ...prev,
        [page]: lastVisible,
      }));

      // Check if there are more pages
      setHasMore(itemsSnapshot.docs.length === itemsPerPage);

      setItems(itemsList);

      // Get total count
      const countQuery = query(itemsRef);
      const totalCount = await getCountFromServer(countQuery);
      setTotalItems(totalCount.data().count);
    } catch (error) {
      toast.error("Failed to fetch items");
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data) => {
    try {
      const newItem = {
        ...data,
        createdAt: new Date().toISOString(),
      };
      await addDoc(collection(db, collectionId), newItem);
      toast.success("Item created successfully");
      fetchItems();
      setIsModalOpen(false);
    } catch (error) {
      toast.error("Failed to create item");
      console.error("Error creating item:", error);
    }
  };

  const handleUpdate = async (obj) => {
    try {
      const { id, ...data } = obj;

      const docRef = doc(db, collectionId, id);
      const updateData = {
        ...data,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(docRef, updateData);
      toast.success("Item updated successfully");
      fetchItems();
      setIsModalOpen(false);
    } catch (error) {
      toast.error("Failed to update item");
      console.error("Error updating item:", error);
    }
  };

  const handleSort = (field) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleFilterChange = (field, value) => {
    setTempFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApplyFilters = () => {
    const processedFilters = Object.entries(tempFilters).reduce(
      (acc, [key, value]) => {
        if (key === "createdAt" || key === "updatedAt") {
          acc[key] = value ? dayjs(value).format("YYYY-MM-DD") : "";
        } else {
          acc[key] = value;
        }
        return acc;
      },
      {}
    );

    setFilters(processedFilters);
  };

  const handleResetFilters = () => {
    setTempFilters({});
    setFilters({});
  };

  const handlePageChange = async (newPage) => {
    if (newPage < 1 || newPage > Math.ceil(totalItems / itemsPerPage)) return;

    setCurrentPage(newPage);
    await fetchItems(newPage);
  };

  const handleDeleteItem = async (itemId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this item? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await deleteDoc(doc(db, collectionId, itemId));
      toast.success("Item deleted successfully");
      fetchItems(currentPage);
    } catch (error) {
      toast.error("Failed to delete item");
      console.error("Error deleting item:", error);
    }
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map((item) => item.id)));
    }
    setIsAllSelected(!isAllSelected);
  };

  const handleSelectItem = (itemId) => {
    const newSelectedItems = new Set(selectedItems);
    if (newSelectedItems.has(itemId)) {
      newSelectedItems.delete(itemId);
    } else {
      newSelectedItems.add(itemId);
    }
    setSelectedItems(newSelectedItems);
    setIsAllSelected(newSelectedItems.size === items.length);
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return;

    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedItems.size} item(s)? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const batch = writeBatch(db);
      selectedItems.forEach((itemId) => {
        const docRef = doc(db, collectionId, itemId);
        batch.delete(docRef);
      });

      await batch.commit();
      toast.success(`${selectedItems.size} item(s) deleted successfully`);
      setSelectedItems(new Set());
      setIsAllSelected(false);
      fetchItems(currentPage);
    } catch (error) {
      toast.error("Failed to delete items");
      console.error("Error deleting items:", error);
    }
  };

  function renderHeader() {
    return (
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <div className="flex items-center">
            <h1 className="text-2xl font-semibold text-gray-900 mr-4">
              {collectionData?.name}
            </h1>
            {loading && (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-700">
            {collectionData?.description}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            to={`/collections/${collectionId}/items/new`}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            New Item
          </Link>
        </div>
      </div>
    );
  }

  function renderFilters() {
    return (
      <div className="mt-6">
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200"
        >
          {isFilterOpen ? (
            <ChevronUpIcon className="h-5 w-5 mr-2" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 mr-2" />
          )}
          Filters
        </button>

        {isFilterOpen && (
          <div className="mt-4 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {collectionData?.fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Filter by {field.name}
                  </label>
                  {field.type === "date" ? (
                    <input
                      type="date"
                      value={tempFilters[field.name] || ""}
                      onChange={(e) =>
                        handleFilterChange(field.name, e.target.value)
                      }
                      className={`${inputClasses.base} ${inputClasses.date}`}
                    />
                  ) : (
                    <input
                      type="text"
                      value={tempFilters[field.name] || ""}
                      onChange={(e) =>
                        handleFilterChange(field.name, e.target.value)
                      }
                      className={`${inputClasses.base} ${inputClasses.text}`}
                      placeholder={`Enter ${field.name}...`}
                    />
                  )}
                </div>
              ))}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Filter by Created Date
                </label>
                <input
                  type="date"
                  value={tempFilters.createdAt || ""}
                  onChange={(e) =>
                    handleFilterChange("createdAt", e.target.value)
                  }
                  className={`${inputClasses.base} ${inputClasses.date}`}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Filter by Updated Date
                </label>
                <input
                  type="date"
                  value={tempFilters.updatedAt || ""}
                  onChange={(e) =>
                    handleFilterChange("updatedAt", e.target.value)
                  }
                  className={`${inputClasses.base} ${inputClasses.date}`}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={handleResetFilters}
                className={buttonClasses.secondary}
              >
                Reset
              </button>
              <button
                onClick={handleApplyFilters}
                className={buttonClasses.primary}
              >
                <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderDataTable() {
    return (
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <div className="bg-white px-4 py-4 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  {/* <input
          type="checkbox"
          checked={isAllSelected}
          onChange={handleSelectAll}
          className={`${inputClasses.checkbox} cursor-pointer`}
        /> */}
                  <span className="text-sm font-medium text-gray-700">
                    {selectedItems.size} selected
                  </span>
                </div>
                {selectedItems.size > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    className={buttonClasses.danger}
                  >
                    <TrashIcon className="h-5 w-5 mr-2" />
                    Delete Selected
                  </button>
                )}
              </div>
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="relative w-12 px-6 sm:w-16 sm:px-8"
                    >
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className={`absolute left-4 top-1/2 -mt-2.5 cursor-pointer ${inputClasses.checkbox}`}
                      />
                    </th>
                    {collectionData?.fields.map((field) => (
                      <th
                        key={field.name}
                        scope="col"
                        className="py-3.5 pl-4 pr-3 capitalize text-left text-sm font-semibold text-gray-900 sm:pl-6 cursor-pointer"
                        onClick={() => handleSort(field.name)}
                      >
                        {field.name}
                        {sortField === field.name && (
                          <span className="ml-1">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </th>
                    ))}
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                      onClick={() => handleSort("createdAt")}
                    >
                      Created At
                      {sortField === "createdAt" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                      onClick={() => handleSort("updatedAt")}
                    >
                      Updated At
                      {sortField === "updatedAt" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="relative py-3.5 pl-3 pr-4 sm:pr-6"
                    >
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className={
                        selectedItems.has(item.id)
                          ? "bg-blue-50"
                          : "hover:bg-gray-50 transition-colors duration-200"
                      }
                    >
                      <td className="relative w-12 px-6 sm:w-16 sm:px-8">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => handleSelectItem(item.id)}
                          className={`absolute left-4 top-1/2 -mt-2.5 cursor-pointer ${inputClasses.checkbox}`}
                        />
                      </td>
                      {collectionData?.fields.map((field) => (
                        <td
                          key={field.name}
                          className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 sm:pl-6"
                        >
                          {item[field.name] !== undefined
                            ? String(item[field.name])
                            : "-"}
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {item.createdAt
                          ? dayjs(item.createdAt).format("DD.MM.YYYY HH:mm:ss")
                          : "-"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {item.updatedAt
                          ? dayjs(item.updatedAt).format("DD.MM.YYYY HH:mm:ss")
                          : "-"}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex justify-end space-x-3">
                          <Link
                            to={`/collections/${collectionId}/items/${item.id}/edit`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </Link>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-red-600 hover:text-red-900 cursor-pointer"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td
                        colSpan={collectionData?.fields.length + 3}
                        className="px-3 py-4 text-sm text-gray-500 text-center"
                      >
                        No items found. Create your first item to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!collectionData && !loading) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900">
          Collection not found
        </h2>
        <Link to="/" className="mt-4 text-blue-600 hover:text-blue-900">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header Section */}
      {renderHeader()}

      {/* Filters Section */}
      {renderFilters()}

      {/* Table Section */}
      {renderDataTable()}

      {/* Pagination Section */}
      <CustomPagination
        items={items}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        handlePageChange={handlePageChange}
        currentPage={currentPage}
        hasMore={hasMore}
      />

      {isModalOpen && (
        <ItemForm
          collectionData={collectionData}
          item={selectedItem}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedItem(null);
          }}
          onSubmit={selectedItem ? handleUpdate : handleCreate}
        />
      )}
    </div>
  );
}

function ItemForm({ collectionData, item, onClose, onSubmit }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: item || {},
  });

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-medium text-gray-900 mb-6">
          {item ? "Edit Item" : "Add New Item"}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {collectionData?.fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {field.name}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderFieldInput(field, register, errors)}
            </div>
          ))}

          <div className="mt-8 flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className={buttonClasses.secondary}
            >
              Cancel
            </button>
            <button type="submit" className={buttonClasses.primary}>
              {item ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function renderFieldInput(field, register, errors) {
  const commonProps = {
    ...register(field.name, {
      required: field.required ? `${field.name} is required` : false,
    }),
    className: `${inputClasses.base} ${
      field.type === "checkbox"
        ? inputClasses.checkbox
        : field.type === "date"
        ? inputClasses.date
        : field.type === "select"
        ? inputClasses.select
        : inputClasses.text
    }`,
  };

  const errorMessage = errors[field.name]?.message;

  switch (field.type) {
    case "boolean":
      return (
        <div className="flex items-center space-x-3">
          <input type="checkbox" {...commonProps} />
          <span className="text-sm text-gray-500">Yes/No</span>
          {errorMessage && (
            <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
          )}
        </div>
      );
    case "date":
      return (
        <div>
          <input type="date" {...commonProps} value={commonProps.value || ""} />
          {errorMessage && (
            <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
          )}
        </div>
      );
    case "number":
      return (
        <div>
          <input
            type="number"
            {...commonProps}
            placeholder={`Enter ${field.name}...`}
          />
          {errorMessage && (
            <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
          )}
        </div>
      );
    case "enum":
      return (
        <div>
          <select {...commonProps}>
            <option value="">Select {field.name}</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errorMessage && (
            <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
          )}
        </div>
      );
    default:
      return (
        <div>
          <input
            type="text"
            {...commonProps}
            placeholder={`Enter ${field.name}...`}
          />
          {errorMessage && (
            <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
          )}
        </div>
      );
  }
}
