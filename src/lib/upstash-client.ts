/** biome-ignore-all lint/style/noNonNullAssertion: <> */
import { Search } from "@upstash/search";

const upstashClient = new Search({
  url: process.env.UPSTASH_SEARCH_REST_URL!,
  token: process.env.UPSTASH_SEARCH_REST_TOKEN!,
});

export const upstashIndex = upstashClient.index("hjrbda");
