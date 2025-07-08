# config/swagger.yaml
openapi: 3.0.0
info:
  title: Aurum Fox Unified Portal API
  description: API documentation for the Aurum Fox Unified Portal backend.
  version: 1.0.0
servers:
  - url: http://localhost:3000/api/v1
    description: Development server
tags:
  - name: Authentication
    description: User authentication and authorization
  - name: Announcements
    description: Public announcements and news
  - name: NFTs
    description: NFT Marketplace and user-owned NFTs
  - name: Photos
    description: Photo gallery and media uploads
  - name: Posts
    description: Blog posts and articles
  - name: Games
    description: Web3 games integration
  - name: Ads
    description: Advertising management

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    User:
      type: object
      properties:
        walletAddress:
          type: string
          description: Solana wallet address of the user.
          example: "AfoxUserWallet1234567890abcdefghijklmnopqrstuvw"
        role:
          type: string
          enum: [user, admin, developer, publisher, advertiser]
          description: Role of the user.
          example: "user"
        createdAt:
          type: string
          format: date-time
          description: Date and time when the user was created.
        updatedAt:
          type: string
          format: date-time
          description: Date and time when the user was last updated.
      required:
        - walletAddress
        - role
    AuthResponse:
      type: object
      properties:
        success:
          type: boolean
          example: true
        message:
          type: string
          example: "Login successful"
        token:
          type: string
          description: JWT token for authentication.
        user:
          $ref: '#/components/schemas/User'
    Announcement:
      type: object
      properties:
        id:
          type: string
          description: The unique identifier for the announcement.
          example: "654321098765432109876543"
        text:
          type: string
          description: The content of the announcement.
          example: "Welcome to our new platform!"
        date:
          type: string
          format: date-time
          description: The date the announcement was made.
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
      required:
        - text
        - date
    ErrorResponse:
      type: object
      properties:
        success:
          type: boolean
          example: false
        message:
          type: string
          example: "Validation Failed"
        stack:
          type: string
          description: Stack trace (only in development).
        details:
          type: array
          items:
            type: string
          example: ["Announcement text is required and must be between 5 and 1000 characters."]

paths:
  /auth/register:
    post:
      summary: Register a new user
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                walletAddress:
                  type: string
                  example: "NewUserWallet1234567890abcdefghijklmnopqrstuvw"
                password:
                  type: string
                  example: "securepassword123"
              required:
                - walletAddress
                - password
      responses:
        '201':
          description: User registered successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
        '400':
          description: Bad request (e.g., validation error, duplicate wallet)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
  /auth/login:
    post:
      summary: Log in a user
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                walletAddress:
                  type: string
                  example: "ExistingUserWallet1234567890abcdefghijklmnopqrstuvw"
                password:
                  type: string
                  example: "securepassword123"
              required:
                - walletAddress
                - password
      responses:
        '200':
          description: User logged in successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
        '400':
          description: Invalid credentials
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
  /announcements:
    get:
      summary: Get all announcements
      tags:
        - Announcements
      responses:
        '200':
          description: A list of announcements
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  count:
                    type: integer
                    example: 2
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Announcement'
    post:
      summary: Create a new announcement (Admin only)
      tags:
        - Announcements
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                text:
                  type: string
                  example: "Important update: New features coming soon!"
              required:
                - text
      responses:
        '201':
          description: Announcement created successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  message:
                    type: string
                    example: "Announcement published successfully"
                  data:
                    $ref: '#/components/schemas/Announcement'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Forbidden (Not authorized as admin)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '400':
          description: Bad request (validation error)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
  /announcements/{id}:
    put:
      summary: Update an announcement by ID (Admin only)
      tags:
        - Announcements
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          schema:
            type: string
          required: true
          description: The ID of the announcement to update.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                text:
                  type: string
                  example: "Updated announcement text."
      responses:
        '200':
          description: Announcement updated successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  message:
                    type: string
                    example: "Announcement updated successfully"
                  data:
                    $ref: '#/components/schemas/Announcement'
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '404':
          description: Announcement not found
        '400':
          description: Bad request (invalid ID or validation error)
    delete:
      summary: Delete an announcement by ID (Admin only)
      tags:
        - Announcements
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          schema:
            type: string
          required: true
          description: The ID of the announcement to delete.
      responses:
        '200':
          description: Announcement deleted successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  message:
                    type: string
                    example: "Announcement deleted successfully"
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '404':
          description: Announcement not found
        '400':
          description: Bad request (invalid ID)
