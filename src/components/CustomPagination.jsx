import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
// CUSTOM IMPORTS
import { buttonClasses, inputClasses } from "../constants/styleClasses";

const PAGE_LIMIT_OPTIONS = [5, 10, 25, 50, 100, 500];

export default function CustomPagination({
  items,
  totalItems,
  itemsPerPage,
  setItemsPerPage,
  handlePageChange,
  currentPage,
  hasMore,
}) {
  return (
    <div className="mt-6 flex items-center justify-between bg-white px-6 py-4 border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-center space-x-4">
        <div className="text-sm text-gray-700">
          Showing {items.length} of {totalItems} items
        </div>
        <div className="flex items-center space-x-2">
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
  );
}
