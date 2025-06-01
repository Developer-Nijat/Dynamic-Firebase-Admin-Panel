import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import toast from "react-hot-toast";
// CUSTOM IMPORTS
import { db } from "../config/firebase";
import { FIELD_TYPES } from "../constants/fieldTypes";
import { buttonClasses, inputClasses } from "../constants/styleClasses";

export default function CollectionBuilder() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    fields: [],
  });

  const [rawOptions, setRawOptions] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddField = () => {
    setFormData((prev) => ({
      ...prev,
      fields: [
        ...prev.fields,
        {
          type: "string",
          name: "",
          required: false,
          options: [],
        },
      ],
    }));
  };

  const handleRemoveField = (index) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  };

  const handleFieldChange = (index, field) => {
    if (field.type === "enum" && field.options) {
      setRawOptions((prev) => ({
        ...prev,
        [index]: field.options,
      }));
    }
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.map((f, i) => (i === index ? { ...f, ...field } : f)),
    }));
  };

  const handleOptionsChange = (index, value) => {
    setRawOptions((prev) => ({
      ...prev,
      [index]: value,
    }));

    const processedOptions = value
      .split(",")
      .map((opt) => opt.trim())
      .filter(Boolean);

    handleFieldChange(index, { options: processedOptions });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Collection name is required");
      return;
    }

    if (formData.fields.length === 0) {
      toast.error("At least one field is required");
      return;
    }

    try {
      setLoading(true);
      const docRef = await addDoc(collection(db, "collections"), {
        ...formData,
        createdAt: new Date().toISOString(),
        // updatedAt: new Date().toISOString(),
      });
      toast.success("Collection created successfully");
      navigate(`/collections/${docRef.id}`);
    } catch (error) {
      toast.error("Failed to create collection");
      console.error("Error creating collection:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">
            Create New Collection
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Create a new collection with custom fields.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Collection Name
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`${inputClasses.base} ${inputClasses.text}`}
                placeholder="Enter collection name"
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className={`${inputClasses.base} ${inputClasses.text}`}
                placeholder="Enter collection description"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Fields</h2>
                <button
                  type="button"
                  onClick={handleAddField}
                  className={buttonClasses.secondary}
                >
                  Add Field
                </button>
              </div>

              {formData.fields.map((field, index) => (
                <div
                  key={index}
                  className="bg-gray-50 p-4 rounded-lg space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900">
                      Field {index + 1}
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleRemoveField(index)}
                      className={buttonClasses.danger}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor={`field-name-${index}`}
                        className="block text-sm font-medium text-gray-700"
                      >
                        Field Name
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        type="text"
                        id={`field-name-${index}`}
                        value={field.name}
                        onChange={(e) =>
                          handleFieldChange(index, { name: e.target.value })
                        }
                        className={`${inputClasses.base} ${inputClasses.text}`}
                        placeholder="Enter field name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor={`field-type-${index}`}
                        className="block text-sm font-medium text-gray-700"
                      >
                        Field Type
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <select
                        id={`field-type-${index}`}
                        value={field.type}
                        onChange={(e) =>
                          handleFieldChange(index, { type: e.target.value })
                        }
                        className={`${inputClasses.base} ${inputClasses.select}`}
                        required
                      >
                        {FIELD_TYPES.map((type) => (
                          <option
                            key={type.id}
                            value={type.id}
                            //disabled={type.requiresBlaze}
                          >
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`field-required-${index}`}
                      checked={field.required}
                      onChange={(e) =>
                        handleFieldChange(index, { required: e.target.checked })
                      }
                      className={inputClasses.checkbox}
                    />
                    <label
                      htmlFor={`field-required-${index}`}
                      className="text-sm text-gray-700"
                    >
                      Required
                    </label>
                  </div>

                  {field.type === "enum" && (
                    <div className="space-y-2">
                      <label
                        htmlFor={`field-options-${index}`}
                        className="block text-sm font-medium text-gray-700"
                      >
                        Options
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        type="text"
                        id={`field-options-${index}`}
                        value={rawOptions[index] || field.options.join(", ")}
                        onChange={(e) =>
                          handleOptionsChange(index, e.target.value)
                        }
                        className={`${inputClasses.base} ${inputClasses.text}`}
                        placeholder="Enter options separated by commas"
                        required
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className={buttonClasses.secondary}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={buttonClasses.primary}
          >
            {loading ? "Creating..." : "Create Collection"}
          </button>
        </div>
      </form>
    </div>
  );
}
