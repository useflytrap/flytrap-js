import { FlytrapMode, defineFlytrapConfig } from 'useflytrap'

export default defineFlytrapConfig({
	projectId: 'nuxt-demo',
	publicApiKey:
		'pk_MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1RjIbpCCPfnPhHA51qGwqYpkTP5UQ98akcoMCHTijCK8I/Dvpu0NfP/yYdYUzl1JBW61kUI42+6aTAdPPT3OMl6CFeITHAzcuj7IyNY7l1n279kXsegu2ffFc0kkgi/SKy12ATQRfm52Ji6tf52ZJBydxowAuLhGfaQmiewcbH0O4BAbemX0jOxg+JUa4HvBFZo/R/pTVTsIMZWDwKfa0p/SiphDUeqRRz2j4qBeHPljsbxWmsXOIfy3vl4kpu+mYJP/Ixy16B1+kiWq37keAdwvDSBg61VAQC6TZ+tcRdYb5t2IHmrjOJWByR3BXzC6LqQZAO+//27Hu2S9j8w9RwIDAQAB',
	privateKey:
		'sk_MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDVGMhukII9+c+EcDnWobCpimRM/lRD3xqRygwIdOKMIrwj8O+m7Q18//Jh1hTOXUkFbrWRQjjb7ppMB089Pc4yXoIV4hMcDNy6PsjI1juXWfbv2Rex6C7Z98VzSSSCL9IrLXYBNBF+bnYmLq1/nZkkHJ3GjAC4uEZ9pCaJ7BxsfQ7gEBt6ZfSM7GD4lRrge8EVmj9H+lNVOwgxlYPAp9rSn9KKmENR6pFHPaPioF4c+WOxvFaaxc4h/Le+XiSm76Zgk/8jHLXoHX6SJarfuR4B3C8NIGDrVUBALpNn61xF1hvm3YgeauM4lYHJHcFfMLoupBkA77//bse7ZL2PzD1HAgMBAAECggEAZmSWpn3cfzAidQZB3G5sB0Mex9orHkO9LhFSL9wOIXztPy3d0a01HnuTeUxXSgOL+0bDis0xqggf7ulSO2CPzCcaRa6QNRm/E+ToMIy0LJkHbR844fzpSkXig+9A0idtSt74xUJCJ6inL9ic+GV/ONlhPI54KEovYN63v+0KiVu7hdPjx+0S7ReKcHb8MxHeadrFNItps2OR57wxXF6nFDLYdh698AXugqsBuPZVBKdO0pAG1v9/7cufzvjsUs6wzbyvFtPemKdPqqjxn8XRnS6YXJWsF57XB1+tCSu8kMByvENPDoWGdKtw9HUjlqtqVB0JwDYnApJMqJP/r/nMJQKBgQDtQ+WrT69CTZi7p35ASQENgu7z/U6+tu0TLxWYXVbFOeacEpDFiD35vhvf0Ra4HipEDfegLmruZkhf51fQwpGovqxO/eT/qKCVOtQ4hVcVAbMJpd2UFo9Cp9GH4DoSRNzVsCT/Bn2bfhAcTB1TFiVFXbMwWly7k5XsJkhTv9xcuwKBgQDl7FfR4U5YDt0GXKI5PPxmC3RsiuZjCuldd2qbfck72MajIZl5qPI2T5VfFbxw+KHSj8A64Uk4swm98/e6mPROo4fw5GXdA1W9w3NxEidDqqyHlc07FIZlmfekrHGJPzE3kzJmu1Hai2yNR1SUBhMNpCYhFlarsNOwissf/Cg+5QKBgQCGhEweCBtxF9VT7u4hPEKgim83XZHbhpJ6oeM4cxLS1rTsH4p8s3WPtjzPdBfRYyjLVK/j3O07JDo8RUkATo+OgCvozQGcANqqQKQ5Nz/b5Q7AlY0+fFvUipi81F+YI/qgHDGddOyZz6sKoAywIooW/byt2U1h+5awQDQZZ1lkKQKBgEUYjJ+/NNsTxGp4BixrXnKQOLGx4GCdU9pJ29jUqVf54l/95fCAzCF0MzB7CMFuhrsPhjZro6SNcX0LR0RlWO4VCPJkwRP1P5wik5vEV9ZnAShR5XY+ydDYv2pWhFw5iGHqM3haDNQ/mCSw7gL5/FnaHbdNzkgUgNmKLFb1YWbdAoGAfztw1dzcRHwg/aMbledttoZTaGmzN3u079qSDMq+UfNojU9YmgEPGhOeXOdHQiDGRvF3ByYjtWKga7bIr2DzpM6QrLTrUjlopmaZRprRtMHWu/5xd9H/4+F8v28t98BZQXOY6c67sPO0jFlGWRkkbcqDaOdxR9z6ivNdbo/HlRc=',
	secretApiKey: 'sk_TnBe2CSBNPGE-9jDtiQDvaoef8LOJ17T_xpIvKxVcBJuskGX',
	mode: (process?.env?.FLYTRAP_MODE as FlytrapMode) ?? 'capture',
	captureId: process?.env?.FLYTRAP_CAPTURE_ID ?? undefined,
	logging: ['error', 'api-calls', 'capture', 'storage'],
	excludeDirectories: ['.nuxt']
})
