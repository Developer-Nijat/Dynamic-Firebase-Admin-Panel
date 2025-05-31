import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  getCountFromServer,
  orderBy,
  limit,
  startAfter,
  writeBatch,
} from "firebase/firestore";
import {
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import dayjs from "dayjs";
// CUSTOM IMPORTS
import { db } from "../config/firebase";
import { buttonClasses, inputClasses } from "../constants/styleClasses";

const ITEMS_PER_PAGE = 10;
const PAGE_LIMIT_OPTIONS = [5, 10, 25, 50, 100, 500];

export default function Dashboard() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState({});
  const [filters, setFilters] = useState({});
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastDocs, setLastDocs] = useState({});
  const [hasMore, setHasMore] = useState(true);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);

  useEffect(() => {
    // Reset pagination when sort, filters, or itemsPerPage change
    setCurrentPage(1);
    setLastDocs({});
    fetchCollections();
  }, [sortField, sortDirection, filters, itemsPerPage]);

  const fetchCollections = async (page = 1) => {
    try {
      setLoading(true);
      const collectionsRef = collection(db, "collections");
      let q = query(
        collectionsRef,
        orderBy(sortField, sortDirection),
        limit(itemsPerPage)
      );

      // If not on first page, use the last document from previous page
      if (page > 1 && lastDocs[page - 1]) {
        q = query(
          collectionsRef,
          orderBy(sortField, sortDirection),
          startAfter(lastDocs[page - 1]),
          limit(itemsPerPage)
        );
      }

      const collectionsSnapshot = await getDocs(q);
      let collectionsList = await Promise.all(
        collectionsSnapshot.docs.map(async (doc) => {
          const collectionData = { id: doc.id, ...doc.data() };
          // Get items count for each collection
          const itemsQuery = query(collection(db, collectionData.id));
          const itemsCount = await getCountFromServer(itemsQuery);
          return {
            ...collectionData,
            itemsCount: itemsCount.data().count,
          };
        })
      );

      // Apply filters in memory
      if (Object.keys(filters).length > 0) {
        collectionsList = collectionsList.filter((collection) =>
          Object.entries(filters).every(([field, value]) => {
            if (!value) return true;

            if (field === "createdAt" || field === "updatedAt") {
              const itemDate = dayjs(collection[field]).format("YYYY-MM-DD");
              return itemDate === value;
            }

            return String(collection[field])
              .toLowerCase()
              .includes(String(value).toLowerCase());
          })
        );
      }

      // Store the last document for this page
      const lastVisible =
        collectionsSnapshot.docs[collectionsSnapshot.docs.length - 1];
      setLastDocs((prev) => ({
        ...prev,
        [page]: lastVisible,
      }));

      // Check if there are more pages
      setHasMore(collectionsSnapshot.docs.length === itemsPerPage);

      setCollections(collectionsList);

      // Get total count
      const countQuery = query(collectionsRef);
      const totalCount = await getCountFromServer(countQuery);
      setTotalItems(totalCount.data().count);
    } catch (error) {
      toast.error("Failed to fetch collections");
      console.error("Error fetching collections:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = async (newPage) => {
    if (newPage < 1 || newPage > Math.ceil(totalItems / itemsPerPage)) return;

    setCurrentPage(newPage);
    await fetchCollections(newPage);
  };

  const handleDeleteCollection = async (collectionId, collectionName) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the collection "${collectionName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      // First, get all documents in the collection
      const itemsRef = collection(db, collectionId);
      const itemsSnapshot = await getDocs(itemsRef);

      if (itemsSnapshot.empty) {
        // If collection is empty, just delete the collection document
        await deleteDoc(doc(db, "collections", collectionId));
        toast.success("Collection deleted successfully");
        fetchCollections();
        return;
      }

      // Delete documents in batches of 500 (Firestore batch limit)
      const batchSize = 500;
      const batches = [];
      let currentBatch = writeBatch(db);
      let operationCount = 0;

      itemsSnapshot.docs.forEach((doc) => {
        currentBatch.delete(doc.ref);
        operationCount++;

        if (operationCount === batchSize) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          operationCount = 0;
        }
      });

      if (operationCount > 0) {
        batches.push(currentBatch);
      }

      // Execute all batches
      for (const batch of batches) {
        await batch.commit();
      }

      // After all documents are deleted, delete the collection document
      await deleteDoc(doc(db, "collections", collectionId));

      toast.success("Collection and all its items deleted successfully");
      fetchCollections();
    } catch (error) {
      toast.error("Failed to delete collection");
      console.error("Error deleting collection:", error);
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

  // if (loading) {
  //   return (
  //     <div className="flex items-center justify-center h-64">
  //       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  //     </div>
  //   );
  // }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <div className="flex items-center">
            <h1 className="text-2xl font-semibold text-gray-900 mr-4">
              Collections
            </h1>
            {loading && (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-700">
            A list of all collections in your Firebase database.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link to="/collections/new" className={buttonClasses.primary}>
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            New Collection
          </Link>
        </div>
      </div>

      {/* Filters Section */}
      <div className="mt-4">
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200 cursor-pointer"
        >
          {isFilterOpen ? (
            <ChevronUpIcon className="h-5 w-5 mr-1" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 mr-1" />
          )}
          Filters
        </button>

        {isFilterOpen && (
          <div className="mt-4 p-6 bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <label
                  htmlFor="filter-name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Filter by Name
                </label>
                <input
                  id="filter-name"
                  type="text"
                  value={tempFilters.name || ""}
                  onChange={(e) => handleFilterChange("name", e.target.value)}
                  className={`${inputClasses.base} ${inputClasses.text}`}
                  placeholder="Enter collection name"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="filter-description"
                  className="block text-sm font-medium text-gray-700"
                >
                  Filter by Description
                </label>
                <input
                  id="filter-description"
                  type="text"
                  value={tempFilters.description || ""}
                  onChange={(e) =>
                    handleFilterChange("description", e.target.value)
                  }
                  className={`${inputClasses.base} ${inputClasses.text}`}
                  placeholder="Enter description"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="filter-created"
                  className="block text-sm font-medium text-gray-700"
                >
                  Filter by Created Date
                </label>
                <input
                  id="filter-created"
                  type="date"
                  value={tempFilters.createdAt || ""}
                  onChange={(e) =>
                    handleFilterChange("createdAt", e.target.value)
                  }
                  className={`${inputClasses.base} ${inputClasses.date}`}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="filter-updated"
                  className="block text-sm font-medium text-gray-700"
                >
                  Filter by Updated Date
                </label>
                <input
                  id="filter-updated"
                  type="date"
                  value={tempFilters.updatedAt || ""}
                  onChange={(e) =>
                    handleFilterChange("updatedAt", e.target.value)
                  }
                  className={`${inputClasses.base} ${inputClasses.date}`}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={handleResetFilters}
                className={buttonClasses.secondary}
              >
                Reset Filters
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

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 cursor-pointer"
                      onClick={() => handleSort("name")}
                    >
                      Name
                      {sortField === "name" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                      onClick={() => handleSort("description")}
                    >
                      Description
                      {sortField === "description" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Fields
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                      onClick={() => handleSort("itemsCount")}
                    >
                      Items
                      {sortField === "itemsCount" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
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
                  {collections.map((collection) => (
                    <tr
                      key={collection.id}
                      className="hover:bg-gray-50 transition-colors duration-200"
                    >
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 sm:pl-6">
                        {collection.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {collection.description}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {collection.fields?.length || 0} fields
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {collection.itemsCount || 0} items
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {collection.createdAt
                          ? dayjs(collection.createdAt).format(
                              "DD.MM.YYYY HH:mm:ss"
                            )
                          : "-"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {collection.updatedAt
                          ? dayjs(collection.updatedAt).format(
                              "DD.MM.YYYY HH:mm:ss"
                            )
                          : "-"}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex justify-end space-x-3">
                          <Link
                            to={`/collections/${collection.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </Link>
                          <Link
                            to={`/collections/${collection.id}/edit`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </Link>
                          <button
                            onClick={() =>
                              handleDeleteCollection(
                                collection.id,
                                collection.name
                              )
                            }
                            className="text-red-600 hover:text-red-900 cursor-pointer"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {collections.length === 0 && (
                    <tr>
                      <td
                        colSpan="7"
                        className="px-3 py-4 text-sm text-gray-500 text-center"
                      >
                        No collections found. Create your first collection to
                        get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between bg-white px-6 py-4 border border-gray-200 rounded-lg shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-700">
            Showing {collections.length} of {totalItems} collections
          </div>
          <div className="flex items-center space-x-2">
            {/* <label htmlFor="itemsPerPage" className="text-sm text-gray-700">
              Items per page:
            </label> */}
            <select
              id="itemsPerPage"
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className={`${inputClasses.base} ${inputClasses.text} py-1 px-2`}
            >
              {PAGE_LIMIT_OPTIONS.map((limit) => (
                <option key={limit} value={limit}>
                  {limit}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`${buttonClasses.secondary} ${
              currentPage === 1 ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <ChevronLeftIcon className="h-5 w-5 mr-2" />
            Previous
          </button>

          <span className="text-sm font-medium text-gray-700">
            Page {currentPage} of {Math.ceil(totalItems / itemsPerPage)}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={
              !hasMore || currentPage >= Math.ceil(totalItems / itemsPerPage)
            }
            className={`${buttonClasses.secondary} ${
              !hasMore || currentPage >= Math.ceil(totalItems / itemsPerPage)
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            Next
            <ChevronRightIcon className="h-5 w-5 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
}
