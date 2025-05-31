export const FIELD_TYPES = [
  { id: 'string', name: 'Text' },
  { id: 'number', name: 'Number' },
  { id: 'boolean', name: 'Boolean' },
  { id: 'date', name: 'Date' },
  { id: 'enum', name: 'Enum (Select)' },
  { id: 'array', name: 'Array' },
  { id: 'object', name: 'Object' },
  { id: 'image', name: 'Image (Requires Blaze Plan)', requiresBlaze: true },
  { id: 'file', name: 'File (Requires Blaze Plan)', requiresBlaze: true },
  { id: 'document', name: 'Document (Requires Blaze Plan)', requiresBlaze: true },
];

export const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
  file: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
};

export const getDefaultValueForType = (type) => {
  switch (type) {
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'array':
      return [];
    case 'object':
      return {};
    case 'date':
      return new Date().toISOString().split('T')[0];
    case 'image':
    case 'file':
    case 'document':
      return null;
    default:
      return '';
  }
};

export const getInputTypeForField = (field) => {
  switch (field.type) {
    case 'string':
      return 'text';
    case 'number':
      return 'number';
    case 'boolean':
      return 'checkbox';
    case 'date':
      return 'date';
    case 'enum':
      return 'select';
    case 'image':
    case 'file':
    case 'document':
      return 'file';
    default:
      return 'text';
  }
};

export const getFileTypeForField = (field) => {
  switch (field.type) {
    case 'image':
      return 'image';
    case 'document':
      return 'document';
    case 'file':
      return 'file';
    default:
      return null;
  }
}; 