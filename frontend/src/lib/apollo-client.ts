import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

// Replace this with your actual subgraph endpoint from The Graph Studio
// After deployment, you'll get a URL like:
// https://api.studio.thegraph.com/query/[PROJECT_ID]/resona/version/latest
const SUBGRAPH_ENDPOINT = 'https://api.studio.thegraph.com/query/118567/resona/version/latest';

const httpLink = createHttpLink({
  uri: SUBGRAPH_ENDPOINT,
});

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});
