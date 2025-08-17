# Subgraph Integration Setup

This document explains how to set up the integration with your deployed subgraph on The Graph.

## Prerequisites

- Your subgraph is deployed on The Graph (Polygon Amoy network)
- You have the subgraph endpoint URL

## Setup Steps

### 1. Install Dependencies

Run this command in your `frontend` directory:

```bash
npm install @apollo/client graphql
```

### 2. Configure Subgraph Endpoint

Update the `SUBGRAPH_ENDPOINT` in `src/lib/apollo-client.ts` with your actual subgraph endpoint from The Graph.

Replace:
```typescript
const SUBGRAPH_ENDPOINT = 'https://api.studio.thegraph.com/query/YOUR_DEPLOYMENT_ID/YOUR_SUBGRAPH_NAME';
```

With your actual endpoint, which should look like:
```typescript
const SUBGRAPH_ENDPOINT = 'https://api.studio.thegraph.com/query/12345/your-subgraph-name';
```

### 3. Verify Subgraph Schema

Ensure your subgraph schema includes the `VoiceRegistered` event with these fields:
- `commitment` (bytes32)
- `owner` (address)
- `walrusUri` (string)
- `timestamp` (uint256)

### 4. Test the Integration

1. Start your development server: `npm run dev`
2. Navigate to `/registrations` in your app
3. The component should fetch and display the latest 10 voice registrations

## Features

- **Real-time Updates**: Polls the subgraph every 10 seconds
- **Error Handling**: Displays user-friendly error messages with retry options
- **Loading States**: Shows loading spinner while fetching data
- **Responsive Design**: Mobile-friendly layout with Tailwind CSS
- **Type Safety**: Full TypeScript support with proper interfaces

## Component Structure

- `VoiceRegistrations.tsx` - Main component for displaying registrations
- `apollo-client.ts` - Apollo Client configuration
- `queries.ts` - GraphQL query definitions
- `types/subgraph.ts` - TypeScript type definitions

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your subgraph endpoint allows requests from your domain
2. **Authentication**: Some subgraphs require API keys - add them to the HTTP headers if needed
3. **Network Issues**: Verify your subgraph is deployed and accessible

### Adding Authentication

If your subgraph requires an API key, update `apollo-client.ts`:

```typescript
const httpLink = createHttpLink({
  uri: SUBGRAPH_ENDPOINT,
  headers: {
    'Authorization': `Bearer ${process.env.REACT_APP_SUBGRAPH_API_KEY}`
  }
});
```

## Customization

- Modify the polling interval in `VoiceRegistrations.tsx` (currently 10 seconds)
- Adjust the number of registrations fetched by changing the `first` variable
- Customize the UI styling by modifying the Tailwind classes
