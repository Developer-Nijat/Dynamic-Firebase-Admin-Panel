import { useState, useRef } from "react";
import {
  getDownloadURL,
  ref,
  uploadBytes,
  deleteObject,
} from "firebase/storage";
import toast from "react-hot-toast";
// CUSTOM IMPORTS
import { storage } from "../config/firebase";
import {
  ALLOWED_FILE_TYPES,
  getFileTypeForField,
} from "../constants/fieldTypes";
import { buttonClasses, inputClasses } from "../constants/styleClasses";

export default function FileUpload({ field, value, onChange, required }) {
  const [preview, setPreview] = useState(value);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [currentFileRef, setCurrentFileRef] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileType = getFileTypeForField(field);
    const allowedTypes = ALLOWED_FILE_TYPES[fileType];

    if (!allowedTypes.includes(file.type)) {
      toast.error(
        `Invalid file type. Allowed types: ${allowedTypes.join(", ")}`
      );
      return;
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      toast.error("File size should be less than 5MB");
      return;
    }

    try {
      setUploading(true);

      // Delete previous file if exists
      if (currentFileRef) {
        try {
          await deleteObject(currentFileRef);
        } catch (error) {
          console.warn("Error deleting previous file:", error);
        }
      }

      // Create a unique file path
      const timestamp = Date.now();
      const uniqueFileName = `${timestamp}_${file.name.replace(
        /[^a-zA-Z0-9.]/g,
        "_"
      )}`;
      const filePath = `uploads/${field.name}/${uniqueFileName}`;
      const storageRef = ref(storage, filePath);

      // Upload file with metadata
      const metadata = {
        contentType: file.type,
        customMetadata: {
          fieldName: field.name,
          fieldType: field.type,
          originalName: file.name,
        },
      };

      const snapshot = await uploadBytes(storageRef, file, metadata);
      setCurrentFileRef(snapshot.ref);

      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      setPreview(downloadURL);
      onChange(downloadURL);
      toast.success("File uploaded successfully");
    } catch (error) {
      console.error("Error uploading file:", error);
      let errorMessage = "Failed to upload file";

      if (error.code === "storage/unauthorized") {
        errorMessage = "You are not authorized to upload files";
      } else if (error.code === "storage/canceled") {
        errorMessage = "Upload was canceled";
      } else if (error.code === "storage/retry-limit-exceeded") {
        errorMessage = "Upload failed, please try again";
      } else if (error.code === "storage/quota-exceeded") {
        errorMessage = "Storage quota exceeded. Please upgrade to Blaze plan.";
      }

      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    try {
      if (currentFileRef) {
        await deleteObject(currentFileRef);
      }
    } catch (error) {
      console.warn("Error deleting file:", error);
    }

    setPreview(null);
    onChange(null);
    setCurrentFileRef(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={ALLOWED_FILE_TYPES[getFileTypeForField(field)].join(",")}
          className={`${inputClasses.base} ${inputClasses.text}`}
          required={required && !preview}
          disabled={uploading}
        />
        {preview && (
          <button
            type="button"
            onClick={handleRemove}
            className={buttonClasses.secondary}
            disabled={uploading}
          >
            Remove
          </button>
        )}
      </div>

      {uploading && (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-500">Uploading...</span>
        </div>
      )}

      {preview && (
        <div className="mt-4">
          {field.type === "image" ? (
            <div className="relative">
              <img
                src={preview}
                alt={field.name}
                className="max-w-xs rounded-lg shadow-sm"
              />
              <a
                href={preview}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-2 right-2 bg-white/80 hover:bg-white px-2 py-1 rounded text-sm text-gray-700 hover:text-gray-900 transition-colors"
              >
                View Full Size
              </a>
            </div>
          ) : (
            <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
              <svg
                className="h-8 w-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <a
                href={preview}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700"
              >
                View File
              </a>
            </div>
          )}
        </div>
      )}

      <div className="mt-2 text-sm text-gray-500">
        <p>Note: File upload requires a Firebase Blaze plan.</p>
        <p>
          To enable file uploads, please upgrade your Firebase project to the
          Blaze plan.
        </p>
        <a
          href="https://firebase.google.com/pricing"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700"
        >
          Learn more about Firebase pricing
        </a>
      </div>
    </div>
  );
}
