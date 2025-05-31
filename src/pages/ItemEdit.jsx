import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";
// CUSTOM IMPORTS
import { db } from "../config/firebase";
import { getInputTypeForField } from "../constants/fieldTypes";
import FileUpload from "../components/FileUpload";
import { buttonClasses, inputClasses } from "../constants/styleClasses";

export default function ItemEdit() {
  const { collectionId, itemId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [collectionData, setCollectionData] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchData();
  }, [collectionId, itemId]);

  const fetchData = async () => {
    try {
      // Fetch collection data
      const collectionRef = doc(db, "collections", collectionId);
      const collectionSnap = await getDoc(collectionRef);

      if (!collectionSnap.exists()) {
        toast.error("Collection not found");
        navigate("/dashboard");
        return;
      }

      setCollectionData(collectionSnap.data());

      // Fetch item data
      const itemRef = doc(db, collectionId, itemId);
      const itemSnap = await getDoc(itemRef);

      if (!itemSnap.exists()) {
        toast.error("Item not found");
        navigate(`/collections/${collectionId}`);
        return;
      }

      setFormData(itemSnap.data());
    } catch (error) {
      toast.error("Failed to fetch data");
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (fieldName, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Validate required fields
      const missingFields = collectionData.fields
        .filter((field) => field.required && !formData[field.name])
        .map((field) => field.name);

      if (missingFields.length > 0) {
        toast.error(`Required fields missing: ${missingFields.join(", ")}`);
        return;
      }

      // Update timestamps
      const itemData = {
        ...formData,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, collectionId, itemId), itemData);
      toast.success("Item updated successfully");
      navigate(`/collections/${collectionId}`);
    } catch (error) {
      toast.error("Failed to update item");
      console.error("Error updating item:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Edit Item</h1>
          <p className="mt-2 text-sm text-gray-700">
            Update item in the {collectionData?.name} collection.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
          <div className="space-y-6">
            {collectionData?.fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <label
                  htmlFor={field.name}
                  className="block text-sm font-medium text-gray-700"
                >
                  {field.name}
                  {field.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>

                {getInputTypeForField(field) === "file" ? (
                  <FileUpload
                    field={field}
                    value={formData[field.name]}
                    onChange={(value) => handleInputChange(field.name, value)}
                    required={field.required}
                  />
                ) : (
                  getInputTypeForField(field) === "text" && (
                    <input
                      type="text"
                      id={field.name}
                      value={formData[field.name] || ""}
                      onChange={(e) =>
                        handleInputChange(field.name, e.target.value)
                      }
                      className={`${inputClasses.base} ${inputClasses.text}`}
                      placeholder={`Enter ${field.name}`}
                      required={field.required}
                    />
                  )
                )}

                {getInputTypeForField(field) === "number" && (
                  <input
                    type="number"
                    id={field.name}
                    value={formData[field.name] || ""}
                    onChange={(e) =>
                      handleInputChange(field.name, parseFloat(e.target.value))
                    }
                    className={`${inputClasses.base} ${inputClasses.text}`}
                    placeholder={`Enter ${field.name}`}
                    required={field.required}
                  />
                )}

                {getInputTypeForField(field) === "checkbox" && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={field.name}
                      checked={formData[field.name] || false}
                      onChange={(e) =>
                        handleInputChange(field.name, e.target.checked)
                      }
                      className={inputClasses.checkbox}
                    />
                    <label
                      htmlFor={field.name}
                      className="text-sm text-gray-700"
                    >
                      {field.name}
                    </label>
                  </div>
                )}

                {getInputTypeForField(field) === "date" && (
                  <input
                    type="date"
                    id={field.name}
                    value={formData[field.name] || ""}
                    onChange={(e) =>
                      handleInputChange(field.name, e.target.value)
                    }
                    className={`${inputClasses.base} ${inputClasses.date}`}
                    required={field.required}
                  />
                )}

                {getInputTypeForField(field) === "select" && (
                  <select
                    id={field.name}
                    value={formData[field.name] || ""}
                    onChange={(e) =>
                      handleInputChange(field.name, e.target.value)
                    }
                    className={`${inputClasses.base} ${inputClasses.select}`}
                    required={field.required}
                  >
                    <option value="">Select {field.name}</option>
                    {field.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(`/collections/${collectionId}`)}
            className={buttonClasses.secondary}
          >
            Cancel
          </button>
          <button type="submit" className={buttonClasses.primary}>
            Update Item
          </button>
        </div>
      </form>
    </div>
  );
}
