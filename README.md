# Faux Orator Project Plan

**1. Core Functionality:**

- A platform for Dungeon Masters (DMs) to create and manage D\&D campaigns.
- Tools for creating and managing characters, locations, and other campaign elements.
- A real-time voice communication system for players and DMs.
- AI-powered assistance for generating content and managing the game.
- Integration with D\&D Beyond for accessing character sheets and other resources (deferred to post-MVP).
- Support for the planning workspace and game session workspace UI features.

**2. Data Model:**

- **User:**
  - Attributes:
    - `id` (UUID, Primary Key): Unique identifier for the user.
    - `azureAdUserId` (String, Unique): The user ID from Azure AD. This will be used to link the user account to their Azure AD identity.
    - `username` (String, Unique): User's chosen username.
    - `email` (String, Unique): User's email address.
    - `firstName` (String): User's first name.
    - `lastName` (String): User's last name.
    - `createdAt` (Timestamp): Timestamp of when the user account was created.
    - `updatedAt` (Timestamp): Timestamp of when the user account was last updated.
    - `role` (Enum: "DM", "Player", "Observer"): User's role in the system.
- **Campaign:**
  - Attributes:
    - `id` (UUID, Primary Key): Unique identifier for the campaign.
    - `name` (String): Name of the campaign.
    - `description` (Text): Description of the campaign.
    - `imageUrl` (String, Optional): URL of an image for the campaign.
    - `createdAt` (Timestamp): Timestamp of when the campaign was created.
    - `updatedAt` (Timestamp): Timestamp of when the campaign was last updated.
    - `dmId` (UUID, Foreign Key referencing User.id): ID of the Dungeon Master who created the campaign.
    - `archived` (Boolean, Default: false): Indicates whether the campaign is archived.
- **CampaignSection:**
  - Attributes:
    - `id` (UUID, Primary Key): Unique identifier for the campaign section.
    - `campaignId` (UUID, Foreign Key referencing Campaign.id): ID of the campaign to which this section belongs.
    - `name` (String): Name of the section (e.g., "Characters", "Locations", "Plot").
    - `type` (Enum: "Characters", "Locations", "Plot", "Items", "Events", "Notes"): Type of the section.
    - `createdAt` (Timestamp): Timestamp of when the section was created.
    - `updatedAt` (Timestamp): Timestamp of when the section was last updated.
- **Character:**
  - Attributes:
    - `id` (UUID, Primary Key): Unique identifier for the character.
    - `campaignId` (UUID, Foreign Key referencing Campaign.id): ID of the campaign to which this character belongs.
    - `name` (String): Name of the character.
    - `description` (Text): Description of the character.
    - `imageUrl` (String, Optional): URL of an image for the character.
    - `imageTags` (JSON, Optional): JSON object containing tags or metadata related to the character's image.
    - `createdAt` (Timestamp): Timestamp of when the character was created.
    - `updatedAt` (Timestamp): Timestamp of when the character was last updated.
    - `isPlayerCharacter` (Boolean): Indicates whether the character is a player character or an NPC.
- **Location:**
  - Attributes:
    - `id` (UUID, Primary Key): Unique identifier for the location.
    - `campaignId` (UUID, Foreign Key referencing Campaign.id): ID of the campaign to which this location belongs.
    - `name` (String): Name of the location.
    - `description` (Text): Description of the location.
    - `imageUrl` (String, Optional): URL of an image for the location.
    - `mapData` (JSON, Optional): JSON object containing map-specific data (e.g., tags, coordinates, explored areas).
    - `createdAt` (Timestamp): Timestamp of when the location was created.
    - `updatedAt` (Timestamp): Timestamp of when the location was last updated.
- **Item:**
  - Attributes:
    - `id` (UUID, Primary Key): Unique identifier for the item.
    - `campaignId` (UUID, Foreign Key referencing Campaign.id): ID of the campaign to which this item belongs.
    - `name` (String): Name of the item.
    - `description` (Text): Description of the item.
    - `imageUrl` (String, Optional): URL of an image for the item.
    - `imageTags` (JSON, Optional): JSON object containing tags or metadata related to the item's image.
    - `type` (Enum: "Weapon", "Armor", "Potion", "Scroll", "Wondrous Item", "Consumable", "Treasure", "Other"): Type of the item.
    - `rarity` (Enum: "Common", "Uncommon", "Rare", "Very Rare", "Legendary", "Artifact"): Rarity of the item.
    - `value` (Integer): Monetary value of the item (in a standard currency).
    - `weight` (Decimal): Weight of the item (in a standard unit).
    - `properties` (JSON, Optional): A JSON object storing additional properties of the item, depending on its type.
    - `magical` (Boolean): Indicates whether the item is magical.
    - `attunementRequired` (Boolean): Indicates whether the item requires attunement.
    - `attunementDescription` (Text, Optional): Description of the attunement process and effects.
    - `effectDescription` (Text, Optional): Description of the item's effects when used or equipped.
    - `notes` (Text, Optional): Any additional notes about the item.
    - `createdAt` (Timestamp): Timestamp of when the item was created.
    - `updatedAt` (Timestamp): Timestamp of when the item was last updated.
- **Event:**
  - Attributes:
    - `id` (UUID, Primary Key): Unique identifier for the event.
    - `campaignId` (UUID, Foreign Key referencing Campaign.id): ID of the campaign to which this event belongs.
    - `name` (String): Name of the event.
    - `description` (Text): Description of the event.
    - `date` (Date): Date of the event.
    - `createdAt` (Timestamp): Timestamp of when the event was created.
    - `updatedAt` (Timestamp): Timestamp of when the event was last updated.
- **Note:**
  - Attributes:
    - `id` (UUID, Primary Key): Unique identifier for the note.
    - `campaignId` (UUID, Foreign Key referencing Campaign.id): ID of the campaign to which this note belongs.
    - `title` (String): Title of the note.
    - `content` (Text): Content of the note.
    - `createdAt` (Timestamp): Timestamp of when the note was created.
    - `updatedAt` (Timestamp): Timestamp of when the note was last updated.
- **Node:**
  - Attributes:
    - `id` (UUID, Primary Key): Unique identifier for the node.
    - `campaignId` (UUID, Foreign Key referencing Campaign.id): ID of the campaign to which this node belongs.
    - `text` (Text): Text content of the node.
    - `type` (Enum: "Prompt", "Scene Description", "NPC Dialogue", "Plot Point", "Note"): Type of the node.
    - `x` (Integer): X-coordinate of the node in the planning workspace.
    - `y` (Integer): Y-coordinate of the node in the planning workspace.
    - `createdAt` (Timestamp): Timestamp of when the node was created.
    - `updatedAt` (Timestamp): Timestamp of when the node was last updated.
- **NodeConnection:**
  - Attributes:
    - `id` (UUID, Primary Key): Unique identifier for the connection.
    - `sourceNodeId` (UUID, Foreign Key referencing Node.id): ID of the source node.
    - `targetNodeId` (UUID, Foreign Key referencing Node.id): ID of the target node.
- **SessionPlan:**
  - Attributes:
    - `id` (UUID, Primary Key): Unique identifier for the session plan.
    - `campaignId` (UUID, Foreign Key referencing Campaign.id): ID of the campaign to which this session plan belongs.
    - `name` (String): Name of the session plan.
    - `description` (Text): Description of the session plan.
    - `startDate` (Date): Date of the session.
    - `endDate` (Date): Date of the session.
    - `createdAt` (Timestamp): Timestamp of when the session plan was created.
    - `updatedAt` (Timestamp): Timestamp of when the session plan was last updated.
- **CampaignUser:**
  - Attributes:
    - `id` (UUID, Primary Key): Unique identifier for the CampaignUser relationship.
    - `campaignId` (UUID, Foreign Key referencing Campaign.id): ID of the campaign.
    - `userId` (UUID, Foreign Key referencing User.id): ID of the user.
    - `role` (Enum: "DM", "Player", "Collaborator", "Observer"): The user's role within the campaign.
    - `permissions` (JSON, Optional): A JSON object storing specific permissions for the user within the campaign (e.g., read access to certain sections, write access to notes).
- **SectionPermissions:**
  - Attributes:
    - `id` (UUID, Primary Key): Unique identifier for the SectionPermission.
    - `campaignUserId` (UUID, Foreign Key referencing CampaignUser.id): ID of the CampaignUser.
    - `campaignSectionId` (UUID, Foreign Key referencing CampaignSection.id): ID of the CampaignSection.
    - `read` (Boolean): Whether the user has read access to the section.
    - `write` (Boolean): Whether the user has write access to the section.
- **StoryArc:**
  - Attributes:
    - `id` (UUID, Primary Key): Unique identifier for the story arc.
    - `campaignId` (UUID, Foreign Key referencing Campaign.id): ID of the campaign to which this story arc belongs.
    - `characterId` (UUID, Foreign Key referencing Character.id, Optional): ID of the character to which this story arc belongs (if applicable).
    - `name` (String): Name of the story arc.
    - `description` (Text): A detailed description of the story arc, its goals, and potential outcomes.
    - `status` (Enum: "Not Started", "In Progress", "Completed", "Abandoned"): The current status of the story arc.
    - `type` (Enum: "Main", "Character", "Location", "Other"): The type of story arc.
    - `createdAt` (Timestamp): Timestamp of when the story arc was created.
    - `updatedAt` (Timestamp): Timestamp of when the story arc was last updated.
- **StoryArcEvent:**
  - Attributes:
    - `id` (UUID, Primary Key): Unique identifier for the story arc event.
    - `storyArcId` (UUID, Foreign Key referencing StoryArc.id): ID of the story arc to which this event belongs.
    - `eventId` (UUID, Foreign Key referencing Event.id): ID of the event that is relevant to this story arc.
    - `description` (Text): A description of how the event relates to the story arc and its progress.
- **UserCampaignPreference:**
  - Attributes:
    - `id` (UUID, Primary Key): Unique identifier for the user campaign preference.
    - `userId` (UUID, Foreign Key referencing User.id): ID of the user.
    - `campaignId` (UUID, Foreign Key referencing Campaign.id): ID of the campaign.
    - `isFavorite` (Boolean, Default: false): Indicates whether the campaign is a favorite.
    - `isCurrentlyActive` (Boolean, Default: false): Indicates whether the campaign is currently active.

**3. API Endpoints:**

- **User Endpoints:**

  - `POST /api/users/register`: Register a new user.

    - Request Body:

      ```
      {
        "azureAdUserId": "...",
        "username": "...",
        "email": "...",
        "firstName": "...",
        "lastName": "...",
        "password": "..."
      }
      ```

    - Response:

      ```
      {
        "id": "...",
        "username": "...",
        "email": "...",
        "firstName": "...",
        "lastName": "...",
        "role": "..."
      }
      ```

  - `POST /api/users/login`: Log in an existing user.

    - Request Body:

      ```
      {
        "username": "...",
        "password": "..."
      }
      ```

    - Response:

      ```
      {
        "token": "..."
      }
      ```

  - `GET /api/users/me`: Get the currently logged-in user's information (requires authentication).

    - Response:

      ```
      {
        "id": "...",
        "username": "...",
        "email": "...",
        "firstName": "...",
        "lastName": "...",
        "role": "..."
      }
      ```

- **Campaign Endpoints:**

  - `GET /api/campaigns`: Get a list of all campaigns for the logged-in user (requires authentication).

    - Response:

      ```
      [
        {
          "id": "...",
          "name": "...",
          "description": "...",
          "imageUrl": "...",
          "dmId": "...",
          "archived": false,
          "role": "DM" // or "Player", "Collaborator", "Observer"
        },
        ...
      ]
      ```

  - `POST /api/campaigns`: Create a new campaign (requires authentication).

    - Request Body:

      ```
      {
        "name": "...",
        "description": "...",
        "imageUrl": "..."
      }
      ```

    - Response:

      ```
      {
        "id": "...",
        "name": "...",
        "description": "...",
        "imageUrl": "...",
        "dmId": "...",
        "archived": false,
        "role": "Player" // or "DM", "Collaborator", "Observer"
      }
      ```

  - `GET /api/campaigns/:campaignId`: Get a specific campaign by ID (requires authentication).

    - Response:

      ```
      {
        "id": "...",
        "name": "...",
        "description": "...",
        "imageUrl": "...",
        "dmId": "...",
        "archived": false,
        "role": "Player" // or "DM", "Collaborator", "Observer"
      }
      ```

  - `PUT /api/campaigns/:campaignId`: Update an existing campaign (requires authentication).

    - Request Body:

      ```
      {
        "name": "...",
        "description": "...",
        "imageUrl": "..."
      }
      ```

    - Response:

      ```
      {
        "id": "...",
        "name": "...",
        "description": "...",
        "imageUrl": "...",
        "dmId": "...",
        "archived": false,
        "role": "Player" // or "DM", "Collaborator", "Observer"
      }
      ```

  - `DELETE /api/campaigns/:campaignId`: Delete a campaign (requires authentication).

    - Response:

      ```
      {
        "message": "Campaign deleted successfully"
      }
      ```

- **CampaignSection Endpoints:**

  - `GET /api/campaigns/:campaignId/sections`: Get a list of all sections for a specific campaign (requires authentication).

    - Response:

      ```
      [
        {
          "id": "...",
          "campaignId": "...",
          "name": "...",
          "type": "..."
        },
        ...
      ]
      ```

  - `POST /api/campaigns/:campaignId/sections`: Create a new section for a specific campaign (requires authentication).

    - Request Body:

      ```
      {
        "name": "...",
        "type": "..."
      }
      ```

    - Response:

      ```
      {
        "id": "...",
        "campaignId": "...",
        "name": "...",
        "type": "..."
      }
      ```

  - `GET /api/campaigns/:campaignId/sections/:sectionId`: Get a specific section by ID (requires authentication).

    - Response:

      ```
      {
        "id": "...",
        "campaignId": "...",
        "name": "...",
        "type": "..."
      }
      ```

  - `PUT /api/campaigns/:campaignId/sections/:sectionId`: Update an existing section (requires authentication).

    - Request Body:

      ```
      {
        "name": "...",
        "type": "..."
      }
      ```

    - Response:

      ```
      {
        "id": "...",
        "campaignId": "...",
        "name": "...",
        "type": "..."
      }
      ```

  - `DELETE /api/campaigns/:campaignId/sections/:sectionId`: Delete a section (requires authentication).

    - Response:

      ```
      {
        "message": "Section deleted successfully"
      }
      ```

- **Character Endpoints:**

  - `GET /api/campaigns/:campaignId/characters`: Get a list of all characters for a specific campaign (requires authentication).

    - Response:

      ```
      [
        {
          "id": "...",
          "campaignId": "...",
          "name": "...",
          "description": "...",
          "imageUrl": "...",
          "imageTags": "..."
        },
        ...
      ]
      ```

  - `POST /api/campaigns/:campaignId/characters`: Create a new character for a specific campaign (requires authentication).

    - Request Body:

      ```
      {
        "name": "...",
        "description": "...",
        "imageUrl": "...",
        "imageTags": "..."
      }
      ```

    - Response:

      ```
      {
        "id": "...",
        "campaignId": "...",
        "name": "...",
        "description": "...",
        "imageUrl": "...",
        "imageTags": "..."
      }
      ```

  - `GET /api/campaigns/:campaignId/characters/:characterId`: Get a specific character by ID (requires authentication).

    - Response:

      ```
      {
        "id": "...",
        "campaignId": "...",
        "name": "...",
        "description": "...",
        "imageUrl": "...",
        "imageTags": "..."
      }
      ```

  - `PUT /api/campaigns/:campaignId/characters/:characterId`: Update an existing character (requires authentication).

    - Request Body:

      ```
      {
        "name": "...",
        "description": "...",
        "imageUrl": "...",
        "imageTags": "..."
      }
      ```

    - Response:

      ```
      {
        "id": "...",
        "campaignId": "...",
        "name": "...",
        "description": "...",
        "imageUrl": "...",
        "imageTags": "..."
      }
      ```

  - `DELETE /api/campaigns/:campaignId/characters/:characterId`: Delete a character (requires authentication).

    - Response:

      ```
      {
        "message": "Character deleted successfully"
      }
      ```

- **Location Endpoints:**

  - `GET /api/campaigns/:campaignId/locations`: Get a list of all locations for a specific campaign (requires authentication).

    - Response:

      ```
      [
        {
          "id": "...",
          "campaignId": "...",
          "name": "...",
          "description": "...",
          "imageUrl": "...",
          "mapData": "..."
        },
        ...
      ]
      ```

  - `POST /api/campaigns/:campaignId/locations`: Create a new location for a specific campaign (requires authentication).

    - Request Body:

      ```
      {
        "name": "...",
        "description": "...",
        "imageUrl": "...",
        "mapData": "..."
      }
      ```

    - Response:

      ```
      {
        "id": "...",
        "campaignId": "...",
        "name": "...",
        "description": "...",
        "imageUrl": "...",
        "mapData": "..."
      }
      ```

  - `GET /api/campaigns/:campaignId/locations/:locationId`: Get a specific location by ID (requires authentication).

    - Response:

      ```
      {
        "id": "...",
        "campaignId": "...",
        "name": "...",
        "description": "...",
        "imageUrl": "...",
        "mapData": "..."
      }
      ```

  - `PUT /api/campaigns/:campaignId/locations/:locationId`: Update an existing location (requires authentication).

    - Request Body:

      ```
      {
        "name": "...",
        "description": "...",
        "imageUrl": "...",
        "mapData": "..."
      }
      ```

    - Response:

      ```
      {
        "id": "...",
        "campaignId": "...",
        "name": "...",
        "description": "...",
        "imageUrl": "...",
        "mapData": "..."
      }
      ```

  - `DELETE /api/campaigns/:campaignId/locations/:locationId`: Delete a location (requires authentication).

    - Response:

      ```
      {
        "message": "Location deleted successfully"
      }
      ```

- **Item Endpoints:**

  - `GET /api/campaigns/:campaignId/items`: Get a list of all items for a specific campaign (requires authentication).

    - Response:

      ```
      [
        {
          "id": "...",
          "campaignId": "...",
          "name": "...",
          "description": "...",
          "imageUrl": "...",
          "imageTags": "...",
          "type": "...",
          "rarity": "...",
          "value": "...",
          "weight": "...",
          "properties": "...",
          "magical": "...",
          "attunementRequired": "...",
          "attunementDescription": "...",
          "effectDescription": "...",
          "notes": "..."
        },
        ...
      ]
      ```

  - `POST /api/campaigns/:campaignId/items`: Create a new item for a specific campaign (requires authentication).

    - Request Body:

      ```
      {
        "name": "...",
        "description": "...",
        "imageUrl": "...",
        "imageTags": "...",
        "type": "...",
        "rarity": "...",
        "value": "...",
        "weight": "...",
        "properties": "...",
        "magical": "...",
        "attunementRequired": "...",
        "attunementDescription": "...",
        "effectDescription": "...",
        "notes": "..."
      }
      ```

    - Response:

      ```
      {
        "id": "...",
        "campaignId": "...",
        "name": "...",
        "description": "...",
        "imageUrl": "...",
        "imageTags": "...",
        "type": "...",
        "rarity": "...",
        "value": "...",
        "weight": "...",
        "properties": "...",
        "magical": "...",
        "attunementRequired": "...",
        "attunementDescription": "...",
        "effectDescription": "...",
        "notes": "..."
      }
      ```

  - `GET /api/campaigns/:campaignId/items/:itemId`: Get a specific item by ID (requires authentication).

    - Response:

      ```
      {
        "id": "...",
        "campaignId": "...",
        "name": "...",
        "description": "...",
        "imageUrl": "...",
        "imageTags": "...",
        "type": "...",
        "rarity": "...",
        "value": "...",
        "weight": "...",
        "properties": "...",
        "magical": "...",
        "attunementRequired": "...",
        "attunementDescription": "...",
        "effectDescription": "...",
        "notes": "..."
      }
      ```

  - `PUT /api/campaigns/:campaignId/items/:itemId`: Update an existing item (requires authentication).

    - Request Body:

      ```
      {
        "name": "...",
        "description": "...",
        "imageUrl": "...",
        "imageTags": "...",
        "type": "...",
        "rarity": "...",
        "value": "...",
        "weight": "...",
        "properties": "...",
        "magical": "...",
        "attunementRequired": "...",
        "attunementDescription": "...",
        "effectDescription": "...",
        "notes": "..."
      }
      ```

    - Response:

      ```
      {
        "id": "...",
        "campaignId": "...",
        "name": "...",
        "description": "...",
        "imageUrl": "...",
        "imageTags": "...",
        "type": "...",
        "rarity": "...",
        "value": "...",
        "weight": "...",
        "properties": "...",
        "magical": "...",
        "attunementRequired": "...",
        "attunementDescription": "...",
        "effectDescription": "...",
        "notes": "..."
      }
      ```

  - `DELETE /api/campaigns/:campaignId/items/:itemId`: Delete an item (requires authentication).

    - Response:

      ```
      {
        "message": "Item deleted successfully"
      }
      ```

- **Event Endpoints:**
  - `GET /api/campaigns/:campaignId/events`: Get a list of all events for a specific campaign (requires authentication).
  - `POST /api/campaigns/:campaignId/events`: Create a new event for a specific campaign (requires authentication).
  - `GET /api/campaigns/:campaignId/events/:eventId`: Get a specific event by ID (requires authentication).
  - `PUT /api/campaigns/:campaignId/events/:eventId`: Update an existing event (requires authentication).
  - `DELETE /api/campaigns/:campaignId/events/:eventId`: Delete an event (requires authentication).
    _(These endpoints would follow a similar pattern to the Character endpoints, with request and response bodies reflecting the attributes of the Event entity.)_
- **Note Endpoints:**
  - `GET /api/campaigns/:campaignId/notes`: Get a list of all notes for a specific campaign (requires authentication).
  - `POST /api/campaigns/:campaignId/notes`: Create a new note for a specific campaign (requires authentication).
  - `GET /api/campaigns/:campaignId/notes/:noteId`: Get a specific note by ID (requires authentication).
  - `PUT /api/campaigns/:campaignId/notes/:noteId`: Update an existing note (requires authentication).
  - `DELETE /api/campaigns/:campaignId/notes/:noteId`: Delete a note (requires authentication).
    _(These endpoints would follow a similar pattern to the Character endpoints, with request and response bodies reflecting the attributes of the Note entity.)_
- **Node Endpoints:**
  - `GET /api/campaigns/:campaignId/nodes`: Get a list of all nodes for a specific campaign (requires authentication).
  - `POST /api/campaigns/:campaignId/nodes`: Create a new node for a specific campaign (requires authentication).
  - `GET /api/campaigns/:campaignId/nodes/:nodeId`: Get a specific node by ID (requires authentication).
  - `PUT /api/campaigns/:campaignId/nodes/:nodeId`: Update an existing node (requires authentication).
  - `DELETE /api/campaigns/:campaignId/nodes/:nodeId`: Delete a node (requires authentication).
    _(These endpoints would follow a similar pattern to the Character endpoints, with request and response bodies reflecting the attributes of the Node entity.)_
- **NodeConnection Endpoints:**
  - `GET /api/campaigns/:campaignId/nodeconnections`: Get a list of all node connections for a specific campaign (requires authentication).
  - `POST /api/campaigns/:campaignId/nodeconnections`: Create a new node connection for a specific campaign (requires authentication).
  - `GET /api/campaigns/:campaignId/nodeconnections/:nodeConnectionId`: Get a specific node connection by ID (requires authentication).
  - `PUT /api/campaigns/:campaignId/nodeconnections/:nodeConnectionId`: Update an existing node connection (requires authentication).
  - `DELETE /api/campaigns/:campaignId/nodeconnections/:nodeConnectionId`: Delete a node connection (requires authentication).
    _(These endpoints would follow a similar pattern to the Character endpoints, with request and response bodies reflecting the attributes of the NodeConnection entity.)_
- **SessionPlan Endpoints:**
  - `GET /api/campaigns/:campaignId/sessionplans`: Get a list of all session plans for a specific campaign (requires authentication).
  - `POST /api/campaigns/:campaignId/sessionplans`: Create a new session plan for a specific campaign (requires authentication).
  - `GET /api/campaigns/:campaignId/sessionplans/:sessionPlanId`: Get a specific session plan by ID (requires authentication).
  - `PUT /api/campaigns/:campaignId/sessionplans/:sessionPlanId`: Update an existing session plan (requires authentication).
  - `DELETE /api/campaigns/:campaignId/sessionplans/:sessionPlanId`: Delete a session plan (requires authentication).
    _(These endpoints would follow a similar pattern to the Character endpoints, with request and response bodies reflecting the attributes of the SessionPlan entity.)_
- **CampaignUser Endpoints:**
  - `GET /api/campaigns/:campaignId/users`: Get a list of all users associated with a specific campaign (requires authentication).
  - `POST /api/campaigns/:campaignId/users`: Add a user to a specific campaign (requires authentication).
  - `GET /api/campaigns/:campaignId/users/:userId`: Get a specific user's role and permissions within a campaign (requires authentication).
  - `PUT /api/campaigns/:campaignId/users/:userId`: Update a user's role and permissions within a campaign (requires authentication).
  - `DELETE /api/campaigns/:campaignId/users/:userId`: Remove a user from a campaign (requires authentication).
    _(These endpoints would follow a similar pattern to the Character endpoints, with request and response bodies reflecting the attributes of the CampaignUser entity.)_
- **SectionPermissions Endpoints:**
  - `GET /api/campaigns/:campaignId/sections/:sectionId/permissions`: Get the permissions for a specific section for a specific user (requires authentication).
  - `PUT /api/campaigns/:campaignId/sections/:sectionId/permissions`: Update the permissions for a specific section for a specific user (requires authentication).
    _(These endpoints would follow a similar pattern to the Character endpoints, with request and response bodies reflecting the attributes of the SectionPermissions entity.)_
- **StoryArc Endpoints:**
  - `GET /api/campaigns/:campaignId/storyarcs`: Get a list of all story arcs for a specific campaign (requires authentication).
  - `POST /api/campaigns/:campaignId/storyarcs`: Create a new story arc for a specific campaign (requires authentication).
  - `GET /api/campaigns/:campaignId/storyarcs/:storyArcId`: Get a specific story arc by ID (requires authentication).
  - `PUT /api/campaigns/:campaignId/storyarcs/:storyArcId`: Update an existing story arc (requires authentication).
  - `DELETE /api/campaigns/:campaignId/storyarcs/:storyArcId`: Delete a story arc (requires authentication).
    _(These endpoints would follow a similar pattern to the Character endpoints, with request and response bodies reflecting the attributes of the StoryArc entity.)_
- **AI Integration Endpoints:**

  - `POST /api/campaigns/:campaignId/ai/generate-dialogue`: Generate dialogue for an NPC (requires authentication).

    - Request Body:

      ```
      {
        "characterId": "...",
        "context": "..."
      }
      ```

    - Response:

      ```
      {
        "dialogue": "..."
      }
      ```

  - `POST /api/campaigns/:campaignId/ai/generate-plot-hook`: Generate a plot hook (requires authentication).

    - Request Body:

      ```
      {
        "context": "..."
      }
      ```

    - Response:

      ```
      {
        "plotHook": "..."
      }
      ```

  - `POST /api/campaigns/:campaignId/ai/generate-scene-description`: Generate a scene description (requires authentication).

    - Request Body:

      ```
      {
        "locationId": "...",
        "context": "..."
      }
      ```

    - Response:

      ```
      {
        "sceneDescription": "..."
      }
      ```

  - `POST /api/campaigns/:campaignId/ai/create-location`: Create a new location with AI assistance (requires authentication).

    - Request Body:

      ```
      {
        "description": "...",
        "context": "..."
      }
      ```

    - Response:

      ```
      {
        "name": "...",
        "description": "...",
        "imageUrl": "...",
        "mapData": "..."
      }
      ```

- **UserCampaignPreference Endpoints:**
  - `GET /api/users/:userId/campaigns/preferences`: Get a list of campaign preferences for a specific user (requires authentication).
  - `PUT /api/users/:userId/campaigns/:campaignId/preferences`: Update campaign preferences for a specific user (requires authentication).
    _(These endpoints would follow a similar pattern to the Character endpoints, with request and response bodies reflecting the attributes of the UserCampaignPreference entity.)_

**4. UI Components:**

- Campaign Dashboard
  - Displays a list of campaigns the user is participating in.
  - Allows users to create new campaigns.
  - Provides access to campaign-specific tools and resources.
- Character Sheet
  - **DMA View:** Full character management and editing capabilities (handled within D\&D Beyond).
  - **Player View (MVP Workaround):** Embedded D\&D Beyond character sheet webpage.
- Location Editor
  - Allows DMs to create and manage locations within their campaigns.
  - Provides tools for adding descriptions, images, and other details to locations.
- Item Manager
  - Allows DMs to create and manage items within their campaigns.
  - Provides tools for adding descriptions, properties, and other details to items.
- Event Timeline
  - Displays a timeline of events within a campaign.
  - Allows DMs to create and manage events.
- Note Editor
  - Allows DMs and players to create and manage notes within a campaign.
  - Provides tools for organizing and sharing notes.
- Voice Chat Interface
  - Provides real-time voice communication between players and DMs.
  - Supports features such as muting, volume control, and push-to-talk.
- AI Assistant Panel
  - Provides access to AI-powered features, such as content generation and game management assistance.
- Discord-like user interface with sidebars and a main interaction window.

**5. Project Structure and Architecture:**

```
faux-orator/
├── frontend/         # React frontend application
│   ├── src/          # Source code
│   ├── public/       # Static assets
│   ├── package.json  # Dependencies and scripts
│   └── ...
├── backend/          # Node.js/Express backend application
│   ├── src/          # Source code
│   ├── models/       # Sequelize models
│   ├── routes/       # Express routes
│   ├── config/       # Configuration files
│   ├── package.json  # Dependencies and scripts
│   └── ...
├── README.md         # Project documentation
└── .gitignore        # Git ignore file
```

- Monorepo: Using a single repository for both frontend and backend code.
- API Communication: REST APIs will be used for communication between the frontend and backend.

**6. Technology Stack:**

- Frontend:
  - React
  - TypeScript
  - Redux Toolkit (for state management)
  - Material UI
  - Axios (API Client for REST)
- Backend:
  - Node.js
  - Express
  - TypeScript
  - Sequelize (ORM for PostgreSQL)
  - PostgreSQL

**7. Security Considerations:**

- Using OAuth 2.0 with Azure AD for authentication and authorization.
- Implementing Role-Based Access Control (RBAC) to restrict access to features and data based on user roles.
- Encrypting sensitive data at rest and in transit.
- Validating and sanitizing all user input to prevent security vulnerabilities.
- Conducting regular security audits and penetration testing.
- Developing an incident response plan.

**8. AI Integration Strategy:**

- MVP Focus:
  - Prioritize AI features that provide the most value to DMs, such as content generation and game management assistance.
  - Start with a limited set of AI agents (Lore, Rules, NPC Character, Storyteller) and expand as needed.
  - Focus on fine-tuning the AI agents on a small, high-quality dataset.
- Future Scalability:
  - Design the AI architecture to be scalable and adaptable to future growth.
  - Explore the use of cloud-based AI services to handle increased demand.
  - Implement caching mechanisms to reduce the load on the AI models.
- Implementation Steps:
  - Select pre-trained language models for each AI agent.
  - Gather and curate specialist data (D\&D SRD, homebrew settings, monster manuals, published adventures, user-generated content).
  - Fine-tune the AI agents on the collected specialist data.
  - Implement API endpoints for accessing the AI features.
  - Integrate the AI features into the UI.
- Cost Management and Monetization:
  - Iterative Pricing Strategy:
    - MVP Playtesting: Conduct thorough playtesting of the MVP to gather data on AI usage patterns, query frequency, and associated costs per campaign.
    - Data-Driven Pricing: Use the data collected during playtesting to determine a sustainable price point for the paid tier, considering factors such as weekly usage, query volume, and AI model costs.
    - Flexible Pricing Model: Design the pricing model to be flexible and adaptable, allowing for adjustments based on ongoing cost analysis and user feedback.
  - Tiered Pricing: Implement a tiered pricing model based on usage and features.
    - Free Tier: Limited access to AI features with rate limiting.
    - Paid Tier: "Unlimited" access to AI features with "slow queries" (rate-limited to manage costs).
  - Campaign-Based Subscription: Allow users to subscribe to AI features on a campaign-by-campaign basis.
  - Usage Monitoring: Implement robust usage monitoring to track AI costs and identify potential areas for optimization.
  - AI Model Optimization: Continuously evaluate and optimize AI models to reduce inference costs.
  - Caching: Implement caching mechanisms to reduce the number of AI queries.
  - User Control: Provide users with controls to manage their AI usage and costs.
- AI Usage and Access Control:
  - DMA-Centric AI: Restrict AI features primarily to Dungeon Masters (DMs) and Dungeon Master Assistants (DMAs) to aid in campaign management and content creation.
  - Player Restrictions: Limit or exclude AI feature access for regular players to maintain the human element of gameplay and prevent potential misuse of AI tools.
  - Role-Based Access Control: Implement role-based access control (RBAC) to enforce AI usage restrictions based on user roles within campaigns.
  - Content Moderation: Implement content moderation mechanisms to prevent the generation of inappropriate or harmful content by AI agents.
  - Transparency: Provide users with clear information about the capabilities and limitations of the AI agents.

**9. Future Considerations:**

- Integration with D\&D Beyond for character sheets and other resources.
- Advanced AI features, such as:
  - Automatic campaign generation.
  - Real-time game balancing.
  - Personalized content recommendations.
- Support for other tabletop RPG systems.
- Mobile app for iOS and Android.
- Community features, such as forums and user-generated content.

This project plan provides a comprehensive overview of the Faux Orator project, including its core functionality, data model, API endpoints, UI components, project structure, technology stack, security considerations, AI integration strategy, and future considerations.
