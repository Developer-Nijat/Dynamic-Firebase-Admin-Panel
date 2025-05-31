import { ref, uploadBytes, deleteObject } from "firebase/storage";
// CUSTOM IMPORTS
import { storage } from "../config/firebase";

export const checkBlazePlan = async () => {
  try {
    // Try to create a test file in storage
    const testRef = ref(storage, "test-blaze-plan.txt");
    const testBlob = new Blob(["test"], { type: "text/plain" });

    // Attempt to upload
    await uploadBytes(testRef, testBlob);

    // If successful, clean up the test file
    await deleteObject(testRef);

    return true;
  } catch (error) {
    // Check for specific error codes that indicate Blaze plan is required
    if (
      error.code === "storage/quota-exceeded" ||
      error.code === "storage/unauthorized" ||
      error.message.includes("quota") ||
      error.message.includes("billing")
    ) {
      return false;
    }
    // For other errors, we'll assume Blaze plan is not active
    return false;
  }
};
