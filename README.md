# Family Chore Tracker

A web application to help families track and manage household chores. This application allows users to create family groups, add family members, create chore schedules, and assign chores to specific family members.

## Features

- **User Authentication**: Secure login and registration system with JWT tokens
- **Family Management**: Each user can create and manage their own family group
- **Family Members**: Add and manage family members within your group
- **Chore Tracking**: Create, assign, and track chores with estimated completion times
- **Default Chore Templates**: Pre-populated list of common household chores
- **Chore Scheduling**: Assign schedules (Daily, Weekly, etc.) to chores
- **Status Tracking**: Mark chores as pending or completed
- **Privacy & Security**: All data is private and scoped to each family group

## Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: SQLite3
- **Authentication**: JWT (JSON Web Tokens) with bcryptjs for password hashing
- **Frontend**: HTML, CSS, Vanilla JavaScript

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/anwaryu/CodexRepo.git
   cd CodexRepo
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Usage

### Getting Started

1. **Register**: Create a new account by providing:
   - Username
   - Email
   - Password
   - Family Name

2. **Add Family Members**: Navigate to the "Family Members" tab and add members of your household

3. **Create Chores**: 
   - Go to the "Chores" tab
   - Add new chores manually or use templates from the "Default Chores" tab
   - Assign chores to family members
   - Set schedules (optional)

4. **Track Progress**: Mark chores as completed and filter between pending and completed tasks

### Default Chores

The application comes with 10 pre-defined chores:
- Vacuum living room (20 min)
- Clean bathroom (30 min)
- Wash dishes (15 min)
- Take out trash (5 min)
- Mow lawn (45 min)
- Dust furniture (15 min)
- Clean kitchen (25 min)
- Do laundry (60 min)
- Walk the dog (20 min)
- Water plants (10 min)

## API Endpoints

### Authentication
- `POST /api/register` - Register a new user
- `POST /api/login` - Login user

### Family
- `GET /api/family` - Get family information

### Family Members
- `GET /api/family-members` - Get all family members
- `POST /api/family-members` - Add a new family member
- `DELETE /api/family-members/:id` - Delete a family member

### Chores
- `GET /api/chores` - Get all chores for the family
- `POST /api/chores` - Create a new chore
- `PUT /api/chores/:id` - Update a chore (status, assignment, etc.)
- `DELETE /api/chores/:id` - Delete a chore

### Default Chores
- `GET /api/default-chores` - Get list of default chore templates

## Security Features

- **Password Hashing**: All passwords are hashed using bcryptjs before storage
- **JWT Authentication**: Secure token-based authentication
- **Data Isolation**: Each family's data is completely isolated and only accessible to authenticated users of that family
- **Authorization Checks**: All API endpoints verify that users can only access their own family's data

## Database Schema

The application uses SQLite with the following tables:
- `users` - User accounts
- `families` - Family groups
- `family_members` - Members within each family
- `chores` - Chores assigned to families
- `default_chores` - Template chores

## License

ISC