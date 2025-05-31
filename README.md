# Dynamic Firebase Admin Panel

A powerful and flexible admin panel built with React and Firebase, allowing dynamic collection management and content administration.

## Features

### Authentication & Authorization
- Secure authentication using Firebase Auth
- Role-based access control (Admin/Editor)
- Protected routes and API endpoints
- Session management and auto-logout
- Persistent login state with Zustand store

### Dynamic Collection Management
- Create, edit, and delete collections
- Define custom fields with various types:
  - Text/String
  - Number
  - Boolean
  - Date
  - Enum (Select)
  - Array
  - Object
  - File Upload (requires Blaze plan)
  - Image Upload (requires Blaze plan)
  - Rich Text Editor (requires Blaze plan)
- Bulk operations (multiple delete, update)
- Collection schema validation
- Real-time updates

### Data Management
- Advanced filtering system
  - Text search
  - Date range filters
  - Numeric range filters
  - Boolean filters
  - Enum/Select filters
- Sorting capabilities
  - Single column sort
  - Multi-column sort
  - Ascending/Descending order
- Pagination
  - Configurable page size
  - Page navigation
  - Total items count
  - Current page indicator

### Field Type System
- Centralized field type management
- Support for Blaze plan-required features
- Automatic field type validation
- Default value handling
- Custom field options (e.g., enum values)
- Field dependencies and conditional rendering
- Custom validation rules

### File Management
- File upload support (requires Blaze plan)
- Image upload with preview
- File type validation
- Automatic file cleanup
- Storage quota management
- Multiple file upload
- Progress indicators

### State Management
- Zustand store implementation
  - Authentication state
  - User preferences
  - UI state
  - Collection cache
  - Filter/sort state
- Persistent storage
- State synchronization

### User Interface
- Modern, responsive design with Tailwind CSS
- Dark/Light mode support
- Loading states and animations
- Toast notifications
- Form validation
- Error handling
- Responsive tables
- Modal dialogs
- Confirmation dialogs
- Tooltips
- Dropdown menus
- Search inputs
- Date pickers
- Custom select components

### Firebase Integration
- Real-time database updates
- Secure storage rules
- Blaze plan detection
- Automatic error handling
- CORS configuration
- Offline support
- Data caching
- Batch operations
- Transaction support

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Firebase account
- Firebase project with Blaze plan (for full functionality)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Developer-Nijat/Dynamic-Firebase-Admin-Panel.git
cd dynamic-firebase-admin-panel
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Configure Firebase:
   - Create a new Firebase project
   - Enable Authentication, Firestore, and Storage
   - Copy your Firebase configuration
   - Update `src/config/firebase.js` with your configuration

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

## Firebase Configuration

### Required Services
- Authentication
- Firestore Database
- Storage (for file uploads)

### Security Rules

#### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /collections/{collectionId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

#### Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.resource.size < 5 * 1024 * 1024 && // 5MB
        request.resource.contentType.matches('image/.*|application/pdf');
    }
  }
}
```

## Blaze Plan Features

The following features require a Firebase Blaze plan:
- File uploads
- Image uploads
- Rich text editor
- Large file storage
- Increased storage quota

The application automatically detects Blaze plan status and adjusts available features accordingly.

## Project Structure

```
src/
├── assets/            # Asset files
├── components/        # Reusable components
├── config/            # Configuration files
├── constants/         # Constants and enums
├── context/           # React context providers
├── pages/             # Page components
├── store/             # Zustand store
├── utils/             # Utility functions
└── App.jsx            # Main application component
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [React](https://reactjs.org/)
- [Firebase](https://firebase.google.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Router](https://reactrouter.com/)
- [React Hot Toast](https://react-hot-toast.com/)
- [Zustand](https://github.com/pmndrs/zustand)
