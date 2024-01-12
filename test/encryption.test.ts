import { describe, expect, it } from 'vitest'
import { generateKeyPair, encrypt, decrypt } from '../src/core/encryption'
import { toOneLine } from './testUtils'

const exampleCapture = `

{"json":[{"id":"/src/utils/api.ts-createTRPCNext","args":[{"ssr":false}],"name":"createTRPCNext","scopes":[],"timestamp":1682694248898,"source":{"filePath":"/src/utils/api.ts","lineNumber":23},"output":"FLYTRAP_UNSERIALIZABLE_VALUE"},{"id":"/src/pages/_app.tsx-api.withTRPC","args":[null],"name":"withTRPC","scopes":[],"timestamp":1682694248900,"source":{"filePath":"/src/pages/_app.tsx","lineNumber":13}},{"id":"/src/utils/api.ts-BlockStatement-loggerLink","args":[{}],"name":"loggerLink","scopes":["BlockStatement"],"timestamp":1682694248941,"source":{"filePath":"/src/utils/api.ts","lineNumber":39}},{"id":"/src/utils/api.ts-BlockStatement-getBaseUrl","args":[],"name":"getBaseUrl","scopes":["BlockStatement"],"timestamp":1682694248941,"source":{"filePath":"/src/utils/api.ts","lineNumber":45},"output":""},{"id":"/src/utils/api.ts-BlockStatement-httpBatchLink","args":[{"url":"/api/trpc"}],"name":"httpBatchLink","scopes":["BlockStatement"],"timestamp":1682694248941,"source":{"filePath":"/src/utils/api.ts","lineNumber":44}},{"id":"/src/utils/api.ts-BlockStatement-loggerLink","args":[{}],"name":"loggerLink","scopes":["BlockStatement"],"timestamp":1682694248941,"source":{"filePath":"/src/utils/api.ts","lineNumber":39}},{"id":"/src/utils/api.ts-BlockStatement-getBaseUrl","args":[],"name":"getBaseUrl","scopes":["BlockStatement"],"timestamp":1682694248941,"source":{"filePath":"/src/utils/api.ts","lineNumber":45},"output":""},{"id":"/src/utils/api.ts-BlockStatement-httpBatchLink","args":[{"url":"/api/trpc"}],"name":"httpBatchLink","scopes":["BlockStatement"],"timestamp":1682694248941,"source":{"filePath":"/src/utils/api.ts","lineNumber":44}},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-api.example.hello.useQuery","args":[{"text":"from tRPC"}],"name":"useQuery","scopes":["Home"],"timestamp":1682694248942,"source":{"filePath":"/src/pages/index.tsx","lineNumber":32},"output":{"status":"loading","fetchStatus":"fetching","isLoading":true,"isSuccess":false,"isError":false,"isInitialLoading":true,"data":null,"dataUpdatedAt":0,"error":null,"errorUpdatedAt":0,"failureCount":0,"failureReason":null,"errorUpdateCount":0,"isFetched":false,"isFetchedAfterMount":false,"isFetching":true,"isRefetching":false,"isLoadingError":false,"isPaused":false,"isPlaceholderData":false,"isPreviousData":false,"isRefetchError":false,"isStale":true,"trpc":{"path":"example.hello"}}},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-useState","args":[],"name":"useState","scopes":["Home"],"timestamp":1682694248943,"source":{"filePath":"/src/pages/index.tsx","lineNumber":43},"output":[null,null]},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-api.example.hello.useQuery","args":[{"text":"from tRPC"}],"name":"useQuery","scopes":["Home"],"timestamp":1682694248943,"source":{"filePath":"/src/pages/index.tsx","lineNumber":32},"output":{"status":"loading","fetchStatus":"fetching","isLoading":true,"isSuccess":false,"isError":false,"isInitialLoading":true,"data":null,"dataUpdatedAt":0,"error":null,"errorUpdatedAt":0,"failureCount":0,"failureReason":null,"errorUpdateCount":0,"isFetched":false,"isFetchedAfterMount":false,"isFetching":true,"isRefetching":false,"isLoadingError":false,"isPaused":false,"isPlaceholderData":false,"isPreviousData":false,"isRefetchError":false,"isStale":true,"trpc":{"path":"example.hello"}}},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-useState","args":[],"name":"useState","scopes":["Home"],"timestamp":1682694248943,"source":{"filePath":"/src/pages/index.tsx","lineNumber":43},"output":[null,null]},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-api.example.hello.useQuery","args":[{"text":"from tRPC"}],"name":"useQuery","scopes":["Home"],"timestamp":1682694248978,"source":{"filePath":"/src/pages/index.tsx","lineNumber":32},"output":{"status":"success","fetchStatus":"idle","isLoading":false,"isSuccess":true,"isError":false,"isInitialLoading":false,"data":{"greeting":"Hello from tRPC"},"dataUpdatedAt":1682694248978,"error":null,"errorUpdatedAt":0,"failureCount":0,"failureReason":null,"errorUpdateCount":0,"isFetched":true,"isFetchedAfterMount":true,"isFetching":false,"isRefetching":false,"isLoadingError":false,"isPaused":false,"isPlaceholderData":false,"isPreviousData":false,"isRefetchError":false,"isStale":true,"trpc":{"path":"example.hello"}}},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-useState","args":[],"name":"useState","scopes":["Home"],"timestamp":1682694248979,"source":{"filePath":"/src/pages/index.tsx","lineNumber":43},"output":[null,null]},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-api.example.hello.useQuery","args":[{"text":"from tRPC"}],"name":"useQuery","scopes":["Home"],"timestamp":1682694248979,"source":{"filePath":"/src/pages/index.tsx","lineNumber":32},"output":{"status":"success","fetchStatus":"idle","isLoading":false,"isSuccess":true,"isError":false,"isInitialLoading":false,"data":{"greeting":"Hello from tRPC"},"dataUpdatedAt":1682694248978,"error":null,"errorUpdatedAt":0,"failureCount":0,"failureReason":null,"errorUpdateCount":0,"isFetched":true,"isFetchedAfterMount":true,"isFetching":false,"isRefetching":false,"isLoadingError":false,"isPaused":false,"isPlaceholderData":false,"isPreviousData":false,"isRefetchError":false,"isStale":true,"trpc":{"path":"example.hello"}}},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-useState","args":[],"name":"useState","scopes":["Home"],"timestamp":1682694248979,"source":{"filePath":"/src/pages/index.tsx","lineNumber":43},"output":[null,null]},{"functionId":"/src/pages/index.tsx-Home-anonymous","id":"/src/pages/index.tsx-Home-setInputValue","args":["w"],"name":"setInputValue","scopes":["Home"],"timestamp":1682694251614,"source":{"filePath":"/src/pages/index.tsx","lineNumber":97},"output":null},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-api.example.hello.useQuery","args":[{"text":"from tRPC"}],"name":"useQuery","scopes":["Home"],"timestamp":1682694251614,"source":{"filePath":"/src/pages/index.tsx","lineNumber":32},"output":{"status":"success","fetchStatus":"idle","isLoading":false,"isSuccess":true,"isError":false,"isInitialLoading":false,"data":{"greeting":"Hello from tRPC"},"dataUpdatedAt":1682694250778,"error":null,"errorUpdatedAt":0,"failureCount":0,"failureReason":null,"errorUpdateCount":0,"isFetched":true,"isFetchedAfterMount":true,"isFetching":false,"isRefetching":false,"isLoadingError":false,"isPaused":false,"isPlaceholderData":false,"isPreviousData":false,"isRefetchError":false,"isStale":true,"trpc":{"path":"example.hello"}}},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-useState","args":[],"name":"useState","scopes":["Home"],"timestamp":1682694251615,"source":{"filePath":"/src/pages/index.tsx","lineNumber":43},"output":["w",null]},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-api.example.hello.useQuery","args":[{"text":"from tRPC"}],"name":"useQuery","scopes":["Home"],"timestamp":1682694251615,"source":{"filePath":"/src/pages/index.tsx","lineNumber":32},"output":{"status":"success","fetchStatus":"idle","isLoading":false,"isSuccess":true,"isError":false,"isInitialLoading":false,"data":{"greeting":"Hello from tRPC"},"dataUpdatedAt":1682694250778,"error":null,"errorUpdatedAt":0,"failureCount":0,"failureReason":null,"errorUpdateCount":0,"isFetched":true,"isFetchedAfterMount":true,"isFetching":false,"isRefetching":false,"isLoadingError":false,"isPaused":false,"isPlaceholderData":false,"isPreviousData":false,"isRefetchError":false,"isStale":true,"trpc":{"path":"example.hello"}}},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-useState","args":[],"name":"useState","scopes":["Home"],"timestamp":1682694251615,"source":{"filePath":"/src/pages/index.tsx","lineNumber":43},"output":["w",null]},{"functionId":"/src/pages/index.tsx-Home-anonymous","id":"/src/pages/index.tsx-Home-setInputValue","args":["wo"],"name":"setInputValue","scopes":["Home"],"timestamp":1682694251664,"source":{"filePath":"/src/pages/index.tsx","lineNumber":97},"output":null},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-api.example.hello.useQuery","args":[{"text":"from tRPC"}],"name":"useQuery","scopes":["Home"],"timestamp":1682694251664,"source":{"filePath":"/src/pages/index.tsx","lineNumber":32},"output":{"status":"success","fetchStatus":"idle","isLoading":false,"isSuccess":true,"isError":false,"isInitialLoading":false,"data":{"greeting":"Hello from tRPC"},"dataUpdatedAt":1682694250778,"error":null,"errorUpdatedAt":0,"failureCount":0,"failureReason":null,"errorUpdateCount":0,"isFetched":true,"isFetchedAfterMount":true,"isFetching":false,"isRefetching":false,"isLoadingError":false,"isPaused":false,"isPlaceholderData":false,"isPreviousData":false,"isRefetchError":false,"isStale":true,"trpc":{"path":"example.hello"}}},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-useState","args":[],"name":"useState","scopes":["Home"],"timestamp":1682694251664,"source":{"filePath":"/src/pages/index.tsx","lineNumber":43},"output":["wo",null]},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-api.example.hello.useQuery","args":[{"text":"from tRPC"}],"name":"useQuery","scopes":["Home"],"timestamp":1682694251664,"source":{"filePath":"/src/pages/index.tsx","lineNumber":32},"output":{"status":"success","fetchStatus":"idle","isLoading":false,"isSuccess":true,"isError":false,"isInitialLoading":false,"data":{"greeting":"Hello from tRPC"},"dataUpdatedAt":1682694250778,"error":null,"errorUpdatedAt":0,"failureCount":0,"failureReason":null,"errorUpdateCount":0,"isFetched":true,"isFetchedAfterMount":true,"isFetching":false,"isRefetching":false,"isLoadingError":false,"isPaused":false,"isPlaceholderData":false,"isPreviousData":false,"isRefetchError":false,"isStale":true,"trpc":{"path":"example.hello"}}},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-useState","args":[],"name":"useState","scopes":["Home"],"timestamp":1682694251664,"source":{"filePath":"/src/pages/index.tsx","lineNumber":43},"output":["wo",null]},{"functionId":"/src/pages/index.tsx-Home-anonymous","id":"/src/pages/index.tsx-Home-setInputValue","args":["wor"],"name":"setInputValue","scopes":["Home"],"timestamp":1682694251675,"source":{"filePath":"/src/pages/index.tsx","lineNumber":97},"output":null},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-api.example.hello.useQuery","args":[{"text":"from tRPC"}],"name":"useQuery","scopes":["Home"],"timestamp":1682694251675,"source":{"filePath":"/src/pages/index.tsx","lineNumber":32},"output":{"status":"success","fetchStatus":"idle","isLoading":false,"isSuccess":true,"isError":false,"isInitialLoading":false,"data":{"greeting":"Hello from tRPC"},"dataUpdatedAt":1682694250778,"error":null,"errorUpdatedAt":0,"failureCount":0,"failureReason":null,"errorUpdateCount":0,"isFetched":true,"isFetchedAfterMount":true,"isFetching":false,"isRefetching":false,"isLoadingError":false,"isPaused":false,"isPlaceholderData":false,"isPreviousData":false,"isRefetchError":false,"isStale":true,"trpc":{"path":"example.hello"}}},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-useState","args":[],"name":"useState","scopes":["Home"],"timestamp":1682694251675,"source":{"filePath":"/src/pages/index.tsx","lineNumber":43},"output":["wor",null]},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-api.example.hello.useQuery","args":[{"text":"from tRPC"}],"name":"useQuery","scopes":["Home"],"timestamp":1682694251675,"source":{"filePath":"/src/pages/index.tsx","lineNumber":32},"output":{"status":"success","fetchStatus":"idle","isLoading":false,"isSuccess":true,"isError":false,"isInitialLoading":false,"data":{"greeting":"Hello from tRPC"},"dataUpdatedAt":1682694250778,"error":null,"errorUpdatedAt":0,"failureCount":0,"failureReason":null,"errorUpdateCount":0,"isFetched":true,"isFetchedAfterMount":true,"isFetching":false,"isRefetching":false,"isLoadingError":false,"isPaused":false,"isPlaceholderData":false,"isPreviousData":false,"isRefetchError":false,"isStale":true,"trpc":{"path":"example.hello"}}},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-useState","args":[],"name":"useState","scopes":["Home"],"timestamp":1682694251675,"source":{"filePath":"/src/pages/index.tsx","lineNumber":43},"output":["wor",null]},{"functionId":"/src/pages/index.tsx-Home-anonymous","id":"/src/pages/index.tsx-Home-setInputValue","args":["worn"],"name":"setInputValue","scopes":["Home"],"timestamp":1682694251755,"source":{"filePath":"/src/pages/index.tsx","lineNumber":97},"output":null},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-api.example.hello.useQuery","args":[{"text":"from tRPC"}],"name":"useQuery","scopes":["Home"],"timestamp":1682694251755,"source":{"filePath":"/src/pages/index.tsx","lineNumber":32},"output":{"status":"success","fetchStatus":"idle","isLoading":false,"isSuccess":true,"isError":false,"isInitialLoading":false,"data":{"greeting":"Hello from tRPC"},"dataUpdatedAt":1682694250778,"error":null,"errorUpdatedAt":0,"failureCount":0,"failureReason":null,"errorUpdateCount":0,"isFetched":true,"isFetchedAfterMount":true,"isFetching":false,"isRefetching":false,"isLoadingError":false,"isPaused":false,"isPlaceholderData":false,"isPreviousData":false,"isRefetchError":false,"isStale":true,"trpc":{"path":"example.hello"}}},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-useState","args":[],"name":"useState","scopes":["Home"],"timestamp":1682694251755,"source":{"filePath":"/src/pages/index.tsx","lineNumber":43},"output":["worn",null]},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-api.example.hello.useQuery","args":[{"text":"from tRPC"}],"name":"useQuery","scopes":["Home"],"timestamp":1682694251755,"source":{"filePath":"/src/pages/index.tsx","lineNumber":32},"output":{"status":"success","fetchStatus":"idle","isLoading":false,"isSuccess":true,"isError":false,"isInitialLoading":false,"data":{"greeting":"Hello from tRPC"},"dataUpdatedAt":1682694250778,"error":null,"errorUpdatedAt":0,"failureCount":0,"failureReason":null,"errorUpdateCount":0,"isFetched":true,"isFetchedAfterMount":true,"isFetching":false,"isRefetching":false,"isLoadingError":false,"isPaused":false,"isPlaceholderData":false,"isPreviousData":false,"isRefetchError":false,"isStale":true,"trpc":{"path":"example.hello"}}},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-useState","args":[],"name":"useState","scopes":["Home"],"timestamp":1682694251755,"source":{"filePath":"/src/pages/index.tsx","lineNumber":43},"output":["worn",null]},{"functionId":"/src/pages/index.tsx-Home-anonymous","id":"/src/pages/index.tsx-Home-setInputValue","args":["worng"],"name":"setInputValue","scopes":["Home"],"timestamp":1682694251851,"source":{"filePath":"/src/pages/index.tsx","lineNumber":97},"output":null},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-api.example.hello.useQuery","args":[{"text":"from tRPC"}],"name":"useQuery","scopes":["Home"],"timestamp":1682694251851,"source":{"filePath":"/src/pages/index.tsx","lineNumber":32},"output":{"status":"success","fetchStatus":"idle","isLoading":false,"isSuccess":true,"isError":false,"isInitialLoading":false,"data":{"greeting":"Hello from tRPC"},"dataUpdatedAt":1682694250778,"error":null,"errorUpdatedAt":0,"failureCount":0,"failureReason":null,"errorUpdateCount":0,"isFetched":true,"isFetchedAfterMount":true,"isFetching":false,"isRefetching":false,"isLoadingError":false,"isPaused":false,"isPlaceholderData":false,"isPreviousData":false,"isRefetchError":false,"isStale":true,"trpc":{"path":"example.hello"}}},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-useState","args":[],"name":"useState","scopes":["Home"],"timestamp":1682694251852,"source":{"filePath":"/src/pages/index.tsx","lineNumber":43},"output":["worng",null]},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-api.example.hello.useQuery","args":[{"text":"from tRPC"}],"name":"useQuery","scopes":["Home"],"timestamp":1682694251852,"source":{"filePath":"/src/pages/index.tsx","lineNumber":32},"output":{"status":"success","fetchStatus":"idle","isLoading":false,"isSuccess":true,"isError":false,"isInitialLoading":false,"data":{"greeting":"Hello from tRPC"},"dataUpdatedAt":1682694250778,"error":null,"errorUpdatedAt":0,"failureCount":0,"failureReason":null,"errorUpdateCount":0,"isFetched":true,"isFetchedAfterMount":true,"isFetching":false,"isRefetching":false,"isLoadingError":false,"isPaused":false,"isPlaceholderData":false,"isPreviousData":false,"isRefetchError":false,"isStale":true,"trpc":{"path":"example.hello"}}},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-useState","args":[],"name":"useState","scopes":["Home"],"timestamp":1682694251852,"source":{"filePath":"/src/pages/index.tsx","lineNumber":43},"output":["worng",null]},{"functionId":"/src/pages/index.tsx-Home-anonymous","id":"/src/pages/index.tsx-Home-setInputValue","args":["w"],"name":"setInputValue","scopes":["Home"],"timestamp":1682694252566,"source":{"filePath":"/src/pages/index.tsx","lineNumber":97},"output":null},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-api.example.hello.useQuery","args":[{"text":"from tRPC"}],"name":"useQuery","scopes":["Home"],"timestamp":1682694252567,"source":{"filePath":"/src/pages/index.tsx","lineNumber":32},"output":{"status":"success","fetchStatus":"idle","isLoading":false,"isSuccess":true,"isError":false,"isInitialLoading":false,"data":{"greeting":"Hello from tRPC"},"dataUpdatedAt":1682694250778,"error":null,"errorUpdatedAt":0,"failureCount":0,"failureReason":null,"errorUpdateCount":0,"isFetched":true,"isFetchedAfterMount":true,"isFetching":false,"isRefetching":false,"isLoadingError":false,"isPaused":false,"isPlaceholderData":false,"isPreviousData":false,"isRefetchError":false,"isStale":true,"trpc":{"path":"example.hello"}}},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-useState","args":[],"name":"useState","scopes":["Home"],"timestamp":1682694252567,"source":{"filePath":"/src/pages/index.tsx","lineNumber":43},"output":["w",null]},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-api.example.hello.useQuery","args":[{"text":"from tRPC"}],"name":"useQuery","scopes":["Home"],"timestamp":1682694252567,"source":{"filePath":"/src/pages/index.tsx","lineNumber":32},"output":{"status":"success","fetchStatus":"idle","isLoading":false,"isSuccess":true,"isError":false,"isInitialLoading":false,"data":{"greeting":"Hello from tRPC"},"dataUpdatedAt":1682694250778,"error":null,"errorUpdatedAt":0,"failureCount":0,"failureReason":null,"errorUpdateCount":0,"isFetched":true,"isFetchedAfterMount":true,"isFetching":false,"isRefetching":false,"isLoadingError":false,"isPaused":false,"isPlaceholderData":false,"isPreviousData":false,"isRefetchError":false,"isStale":true,"trpc":{"path":"example.hello"}}},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-useState","args":[],"name":"useState","scopes":["Home"],"timestamp":1682694252567,"source":{"filePath":"/src/pages/index.tsx","lineNumber":43},"output":["w",null]},{"functionId":"/src/pages/index.tsx-Home-anonymous","id":"/src/pages/index.tsx-Home-setInputValue","args":["wr"],"name":"setInputValue","scopes":["Home"],"timestamp":1682694252650,"source":{"filePath":"/src/pages/index.tsx","lineNumber":97},"output":null},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-api.example.hello.useQuery","args":[{"text":"from tRPC"}],"name":"useQuery","scopes":["Home"],"timestamp":1682694252650,"source":{"filePath":"/src/pages/index.tsx","lineNumber":32},"output":{"status":"success","fetchStatus":"idle","isLoading":false,"isSuccess":true,"isError":false,"isInitialLoading":false,"data":{"greeting":"Hello from tRPC"},"dataUpdatedAt":1682694250778,"error":null,"errorUpdatedAt":0,"failureCount":0,"failureReason":null,"errorUpdateCount":0,"isFetched":true,"isFetchedAfterMount":true,"isFetching":false,"isRefetching":false,"isLoadingError":false,"isPaused":false,"isPlaceholderData":false,"isPreviousData":false,"isRefetchError":false,"isStale":true,"trpc":{"path":"example.hello"}}},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-useState","args":[],"name":"useState","scopes":["Home"],"timestamp":1682694252651,"source":{"filePath":"/src/pages/index.tsx","lineNumber":43},"output":["wr",null]},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-api.example.hello.useQuery","args":[{"text":"from tRPC"}],"name":"useQuery","scopes":["Home"],"timestamp":1682694252651,"source":{"filePath":"/src/pages/index.tsx","lineNumber":32},"output":{"status":"success","fetchStatus":"idle","isLoading":false,"isSuccess":true,"isError":false,"isInitialLoading":false,"data":{"greeting":"Hello from tRPC"},"dataUpdatedAt":1682694250778,"error":null,"errorUpdatedAt":0,"failureCount":0,"failureReason":null,"errorUpdateCount":0,"isFetched":true,"isFetchedAfterMount":true,"isFetching":false,"isRefetching":false,"isLoadingError":false,"isPaused":false,"isPlaceholderData":false,"isPreviousData":false,"isRefetchError":false,"isStale":true,"trpc":{"path":"example.hello"}}},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-useState","args":[],"name":"useState","scopes":["Home"],"timestamp":1682694252651,"source":{"filePath":"/src/pages/index.tsx","lineNumber":43},"output":["wr",null]},{"functionId":"/src/pages/index.tsx-Home-anonymous","id":"/src/pages/index.tsx-Home-setInputValue","args":["wro"],"name":"setInputValue","scopes":["Home"],"timestamp":1682694252697,"source":{"filePath":"/src/pages/index.tsx","lineNumber":97},"output":null},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-api.example.hello.useQuery","args":[{"text":"from tRPC"}],"name":"useQuery","scopes":["Home"],"timestamp":1682694252697,"source":{"filePath":"/src/pages/index.tsx","lineNumber":32},"output":{"status":"success","fetchStatus":"idle","isLoading":false,"isSuccess":true,"isError":false,"isInitialLoading":false,"data":{"greeting":"Hello from tRPC"},"dataUpdatedAt":1682694250778,"error":null,"errorUpdatedAt":0,"failureCount":0,"failureReason":null,"errorUpdateCount":0,"isFetched":true,"isFetchedAfterMount":true,"isFetching":false,"isRefetching":false,"isLoadingError":false,"isPaused":false,"isPlaceholderData":false,"isPreviousData":false,"isRefetchError":false,"isStale":true,"trpc":{"path":"example.hello"}}},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-useState","args":[],"name":"useState","scopes":["Home"],"timestamp":1682694252698,"source":{"filePath":"/src/pages/index.tsx","lineNumber":43},"output":["wro",null]},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-api.example.hello.useQuery","args":[{"text":"from tRPC"}],"name":"useQuery","scopes":["Home"],"timestamp":1682694252698,"source":{"filePath":"/src/pages/index.tsx","lineNumber":32},"output":{"status":"success","fetchStatus":"idle","isLoading":false,"isSuccess":true,"isError":false,"isInitialLoading":false,"data":{"greeting":"Hello from tRPC"},"dataUpdatedAt":1682694250778,"error":null,"errorUpdatedAt":0,"failureCount":0,"failureReason":null,"errorUpdateCount":0,"isFetched":true,"isFetchedAfterMount":true,"isFetching":false,"isRefetching":false,"isLoadingError":false,"isPaused":false,"isPlaceholderData":false,"isPreviousData":false,"isRefetchError":false,"isStale":true,"trpc":{"path":"example.hello"}}},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-useState","args":[],"name":"useState","scopes":["Home"],"timestamp":1682694252698,"source":{"filePath":"/src/pages/index.tsx","lineNumber":43},"output":["wro",null]},{"functionId":"/src/pages/index.tsx-Home-anonymous","id":"/src/pages/index.tsx-Home-setInputValue","args":["wron"],"name":"setInputValue","scopes":["Home"],"timestamp":1682694252746,"source":{"filePath":"/src/pages/index.tsx","lineNumber":97},"output":null},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-api.example.hello.useQuery","args":[{"text":"from tRPC"}],"name":"useQuery","scopes":["Home"],"timestamp":1682694252746,"source":{"filePath":"/src/pages/index.tsx","lineNumber":32},"output":{"status":"success","fetchStatus":"idle","isLoading":false,"isSuccess":true,"isError":false,"isInitialLoading":false,"data":{"greeting":"Hello from tRPC"},"dataUpdatedAt":1682694250778,"error":null,"errorUpdatedAt":0,"failureCount":0,"failureReason":null,"errorUpdateCount":0,"isFetched":true,"isFetchedAfterMount":true,"isFetching":false,"isRefetching":false,"isLoadingError":false,"isPaused":false,"isPlaceholderData":false,"isPreviousData":false,"isRefetchError":false,"isStale":true,"trpc":{"path":"example.hello"}}},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-useState","args":[],"name":"useState","scopes":["Home"],"timestamp":1682694252746,"source":{"filePath":"/src/pages/index.tsx","lineNumber":43},"output":["wron",null]},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-api.example.hello.useQuery","args":[{"text":"from tRPC"}],"name":"useQuery","scopes":["Home"],"timestamp":1682694252746,"source":{"filePath":"/src/pages/index.tsx","lineNumber":32},"output":{"status":"success","fetchStatus":"idle","isLoading":false,"isSuccess":true,"isError":false,"isInitialLoading":false,"data":{"greeting":"Hello from tRPC"},"dataUpdatedAt":1682694250778,"error":null,"errorUpdatedAt":0,"failureCount":0,"failureReason":null,"errorUpdateCount":0,"isFetched":true,"isFetchedAfterMount":true,"isFetching":false,"isRefetching":false,"isLoadingError":false,"isPaused":false,"isPlaceholderData":false,"isPreviousData":false,"isRefetchError":false,"isStale":true,"trpc":{"path":"example.hello"}}},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-useState","args":[],"name":"useState","scopes":["Home"],"timestamp":1682694252747,"source":{"filePath":"/src/pages/index.tsx","lineNumber":43},"output":["wron",null]},{"functionId":"/src/pages/index.tsx-Home-anonymous","id":"/src/pages/index.tsx-Home-setInputValue","args":["wrong"],"name":"setInputValue","scopes":["Home"],"timestamp":1682694252838,"source":{"filePath":"/src/pages/index.tsx","lineNumber":97},"output":null},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-api.example.hello.useQuery","args":[{"text":"from tRPC"}],"name":"useQuery","scopes":["Home"],"timestamp":1682694252839,"source":{"filePath":"/src/pages/index.tsx","lineNumber":32},"output":{"status":"success","fetchStatus":"idle","isLoading":false,"isSuccess":true,"isError":false,"isInitialLoading":false,"data":{"greeting":"Hello from tRPC"},"dataUpdatedAt":1682694250778,"error":null,"errorUpdatedAt":0,"failureCount":0,"failureReason":null,"errorUpdateCount":0,"isFetched":true,"isFetchedAfterMount":true,"isFetching":false,"isRefetching":false,"isLoadingError":false,"isPaused":false,"isPlaceholderData":false,"isPreviousData":false,"isRefetchError":false,"isStale":true,"trpc":{"path":"example.hello"}}},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-useState","args":[],"name":"useState","scopes":["Home"],"timestamp":1682694252839,"source":{"filePath":"/src/pages/index.tsx","lineNumber":43},"output":["wrong",null]},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-api.example.hello.useQuery","args":[{"text":"from tRPC"}],"name":"useQuery","scopes":["Home"],"timestamp":1682694252839,"source":{"filePath":"/src/pages/index.tsx","lineNumber":32},"output":{"status":"success","fetchStatus":"idle","isLoading":false,"isSuccess":true,"isError":false,"isInitialLoading":false,"data":{"greeting":"Hello from tRPC"},"dataUpdatedAt":1682694250778,"error":null,"errorUpdatedAt":0,"failureCount":0,"failureReason":null,"errorUpdateCount":0,"isFetched":true,"isFetchedAfterMount":true,"isFetching":false,"isRefetching":false,"isLoadingError":false,"isPaused":false,"isPlaceholderData":false,"isPreviousData":false,"isRefetchError":false,"isStale":true,"trpc":{"path":"example.hello"}}},{"functionId":"/src/pages/index.tsx-Home","id":"/src/pages/index.tsx-Home-useState","args":[],"name":"useState","scopes":["Home"],"timestamp":1682694252839,"source":{"filePath":"/src/pages/index.tsx","lineNumber":43},"output":["wrong",null]},{"functionId":"/src/pages/index.tsx-Home-handleSubmit","id":"/src/pages/index.tsx-Home-handleSubmit-console.log","args":["Input value ","wrong"],"name":"log","scopes":["Home","handleSubmit"],"timestamp":1682694253819,"source":{"filePath":"/src/pages/index.tsx","lineNumber":45},"output":null}],"meta":{"values":{"8.output.data":["undefined"],"9.output.0":["undefined"],"10.output.data":["undefined"],"11.output.0":["undefined"],"13.output.0":["undefined"],"15.output.0":["undefined"],"16.output":["undefined"],"21.output":["undefined"],"26.output":["undefined"],"31.output":["undefined"],"36.output":["undefined"],"41.output":["undefined"],"46.output":["undefined"],"51.output":["undefined"],"56.output":["undefined"],"61.output":["undefined"],"66.output":["undefined"]},"referentialEqualities":{"10.output.refetch":["12.output.refetch","14.output.refetch","17.output.refetch","19.output.refetch","22.output.refetch","24.output.refetch","27.output.refetch","29.output.refetch","32.output.refetch","34.output.refetch","37.output.refetch","39.output.refetch","42.output.refetch","44.output.refetch","47.output.refetch","49.output.refetch","52.output.refetch","54.output.refetch","57.output.refetch","59.output.refetch","62.output.refetch","64.output.refetch"],"10.output.remove":["12.output.remove","14.output.remove","17.output.remove","19.output.remove","22.output.remove","24.output.remove","27.output.remove","29.output.remove","32.output.remove","34.output.remove","37.output.remove","39.output.remove","42.output.remove","44.output.remove","47.output.remove","49.output.remove","52.output.remove","54.output.remove","57.output.remove","59.output.remove","62.output.remove","64.output.remove"],"10.output.trpc":["12.output.trpc","14.output.trpc","17.output.trpc","19.output.trpc","22.output.trpc","24.output.trpc","27.output.trpc","29.output.trpc","32.output.trpc","34.output.trpc","37.output.trpc","39.output.trpc","42.output.trpc","44.output.trpc","47.output.trpc","49.output.trpc","52.output.trpc","54.output.trpc","57.output.trpc","59.output.trpc","62.output.trpc","64.output.trpc"],"11.output.1":["13.output.1","15.output.1","18.output.1","20.output.1","23.output.1","25.output.1","28.output.1","30.output.1","33.output.1","35.output.1","38.output.1","40.output.1","43.output.1","45.output.1","48.output.1","50.output.1","53.output.1","55.output.1","58.output.1","60.output.1","63.output.1","65.output.1"],"12.output.data":["14.output.data","17.output.data","19.output.data","22.output.data","24.output.data","27.output.data","29.output.data","32.output.data","34.output.data","37.output.data","39.output.data","42.output.data","44.output.data","47.output.data","49.output.data","52.output.data","54.output.data","57.output.data","59.output.data","62.output.data","64.output.data"]}}}


`

describe('generateKeyPair', () => {
	it('generates a key pair', async () => {
		const keyPair = (await generateKeyPair()).unwrap()

		expect(keyPair.publicKey.length).toBeGreaterThan(0)
		expect(keyPair.privateKey.length).toBeGreaterThan(0)
		expect(keyPair.publicKey.substring(0, 3)).toBe('pk_')
		expect(keyPair.privateKey.substring(0, 3)).toBe('sk_')
	})
})

describe('encrypt', () => {
	it('encrypts strings', async () => {
		const plaintext = 'Hello, World!'
		const keyPair = (await generateKeyPair()).unwrap()
		const encrypted = (await encrypt(keyPair.publicKey, plaintext)).unwrap()
		expect(encrypted.length).toBeGreaterThan(1)
		expect(encrypted.slice(-2)).toBe('==')
	})
	it('throws for anything other than a string', async () => {
		const keyPair = (await generateKeyPair()).unwrap()
		// @ts-expect-error
		expect(toOneLine((await encrypt(keyPair.publicKey)).val.toString())).toBe(
			toOneLine(
				`because encrypting failed due to invalid plaintext type. Expected "string", received ",".`
			)
		)
	})

	it('throws for invalid public key', async () => {
		// @ts-expect-error
		expect(toOneLine((await encrypt({}, 'Hello, World!')).val.toString())).toBe(
			toOneLine(
				`because encrypting failed due to invalid public key type. Expected "string", received "[object Object]".`
			)
		)
		expect(toOneLine((await encrypt('invalid public key', 'Hello, World!')).val.toString())).toBe(
			toOneLine(
				`because base64 decoding the value "," errored. Error: InvalidCharacterError: The string to be decoded is not correctly encoded.`
			)
		)
	})

	it('encrypts large amount of text', async () => {
		const keyPair = (await generateKeyPair()).unwrap()
		const longString = [...Array(19009).keys()].map(() => 'a').join('')
		const encrypted = (await encrypt(keyPair.publicKey, longString)).unwrap()

		expect(encrypted.length).toBeGreaterThan(longString.length)
		expect(encrypted.slice(-2)).toBe('==')
	})
})

describe('decrypt', () => {
	it('decrypts with correct private key', async () => {
		const plaintext = 'Hello, World!'
		const keyPair = (await generateKeyPair()).unwrap()
		const encrypted = (await encrypt(keyPair.publicKey, plaintext)).unwrap()
		const decrypted = await (await decrypt(keyPair.privateKey, encrypted)).unwrap()
		expect(decrypted).toBe(plaintext)
	})
	it('Returns Err result when decrypting with wrong private key', async () => {
		const plaintext = 'Hello, World!'
		const keyPair = (await generateKeyPair()).unwrap()
		const encrypted = (await encrypt(keyPair.publicKey, plaintext)).unwrap()

		expect(toOneLine((await decrypt('wrong key', encrypted)).val.toString())).toBe(
			toOneLine(`because base64 decoding the value "," errored. Error: 
			InvalidCharacterError: The string to be decoded is not correctly encoded.`)
		)

		// @ts-expect-error
		expect(toOneLine((await decrypt({}, encrypted)).val.toString())).toBe(
			toOneLine(
				`because decrypting failed due to invalid private key type. Expected "string", received "[object Object]".`
			)
		)
	})
	it('Returns Err result when input isnt a string', async () => {
		const keyPair = (await generateKeyPair()).unwrap()

		// @ts-expect-error
		expect(toOneLine((await decrypt(keyPair.privateKey, {})).val.toString())).toBe(
			toOneLine(
				`because decrypting failed due to invalid ciphertext type. Expected "string", received "[object Object]".`
			)
		)

		expect(
			toOneLine((await decrypt(keyPair.privateKey, 'invalid ciphertext')).val.toString())
		).toBe(
			toOneLine(
				`because base64 decoding the value "invalid ciphertext" errored. Error: InvalidCharacterError: The string to be decoded is not correctly encoded.`
			)
		)
	})

	it('decrypts large amount of text', async () => {
		const keyPair = (await generateKeyPair()).unwrap()
		const longString = [...Array(19009).keys()].map(() => 'a').join('')
		const encrypted = (await encrypt(keyPair.publicKey, longString)).unwrap()
		const decrypted = (await decrypt(keyPair.privateKey, encrypted)).unwrap()

		expect(decrypted).toBe(longString)
	})

	it('decrypts example capture', async () => {
		const keyPair = (await generateKeyPair()).unwrap()
		const encrypted = (await encrypt(keyPair.publicKey, exampleCapture)).unwrap()
		const decrypted = (await decrypt(keyPair.privateKey, encrypted)).unwrap()

		expect(decrypted).toBe(exampleCapture)
	})
})
