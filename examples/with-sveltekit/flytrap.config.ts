import { defineFlytrapConfig } from 'useflytrap'

export default defineFlytrapConfig({
	projectId: 'sveltekit-demo',
	publicApiKey:
		'pk_MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3IaRJhGOAOEbmYbpvaWncmHXoebiH7Tjg21gBbMe7HGOf/1MKWHkRgcyW7f0x4RfIrc6/f1wZIjGuF9zUzA2Iazn7NmyFJ0977zvMXRqdyR1Vg8wOyXKtk5LWhtpyrT/PIdXvCObs4nXcpm6IdgvySr8h20wJ6JES4W/r2hzGcDT8xfnH1ULz4UuAdL8mzdQwsjdZwPWfkLTJGeInMEH2hmLlY3N2cLe7xlhZituqGMLU2ZnKFEAICORZuO39s629CW/PIGpeW/qKSAQESbzCU4z7++Y+3/gKHuSeOoI5Hhv+k5iip1hWtyWhQeK/N+8e+c77P5An6R8X7MONAQ4SwIDAQAB',
	secretApiKey: 'sk_BapYNjWX0tH6qxZLl9OZLWIY5oBiSlrKviqnrE23LvsM7THF',
	privateKey:
		'sk_MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDchpEmEY4A4RuZhum9padyYdeh5uIftOODbWAFsx7scY5//UwpYeRGBzJbt/THhF8itzr9/XBkiMa4X3NTMDYhrOfs2bIUnT3vvO8xdGp3JHVWDzA7Jcq2TktaG2nKtP88h1e8I5uziddymboh2C/JKvyHbTAnokRLhb+vaHMZwNPzF+cfVQvPhS4B0vybN1DCyN1nA9Z+QtMkZ4icwQfaGYuVjc3Zwt7vGWFmK26oYwtTZmcoUQAgI5Fm47f2zrb0Jb88gal5b+opIBARJvMJTjPv75j7f+Aoe5J46gjkeG/6TmKKnWFa3JaFB4r837x75zvs/kCfpHxfsw40BDhLAgMBAAECggEALHa9gW18slSxGe2H54MlFf0AW1aQNVBlpzRAbiXFkGr9DnVmC9n/Ctecob2fjzLzc656KIgXR04Es1wbhqRr5bJVOP5T17A0ssfnepM8fDVPq0B4uxRNoSB8NPjeBc8kv3GSkQ6k8DhUxniUfQp36BnQvQWY9gTTvF6FXbqzqndE7J4DZUibPDfa8SKuwEhQxLuCGIMLeWAFtGhgTR5xBl+wyQiFC9G58n4QiO/OkNfuLNkDre282bXIbqj/Y9Czi3Bl08p7uJMZi8BdqNtGwj6FB0cLyVstRFl98xmZQxLEgBUbyPaIhjnOvl38vIAmzx+Lp9E4eUCyZQbRH67wEQKBgQDnuax4PoM4SS6Nv20oyi9Hgt34z8bsP/k5oqCDXNaG0MxG3P8rO/Bde3OtH3+dG/nsfB9t2vwc9mt0yE6tJYjUl7RkykzRN1LF8eAM2vbYjhMz7ElkjtugXmtysHLAstir2A3V00MGu+y/67uO4O4vQcL/EgP/6GoK0mmbghlgLwKBgQDzoIuhpm2d9fJdmIAZlK6Wk+BgYuheq1SpCTwPkOvRkzn9JD95WDfVQb2+/VEfOSJZX0tNorO5cYE0cK2lPxRg0/BhJUm9HXGHlbdnHa6KqZ/VUbj58pv76gOuPleoWbAMTXZfHCCNwHwy979QBnXsjumjMq7sZMChaNdpz/HmpQKBgBMivh9f6i4nvPRvrnAD4kuhfvshDWhNECO2TlMKw5x2eagQb/H+DSdrHm5Zf4xV1xm0VlQYFWG+57jJIdYil14W+QqpuhY831UBWGM3YdMYSHWtOZJYScLAiVb7Qz6uhj4KpXnW7F4N/ssKiH6QDJtSbuvpbPMhGkCyh44T/Ex5AoGBAKW9feC+IWrKDFViTxuYC+JCve20vBLTiifpMWQBmnycJWIyy7/YpTs+m0CYgxyzuMuGSeuKGay6LEUptuhpboqlBK6COJUgt8CeuQO8rKaG2Ua9bxMT2sxZmqFqpiXQxjTIahQwRXFKFvRxmURu8MC7RPUSoPAPZwEoGwxQPGhFAoGAWyHzyrRK08etRhK5yN0YfCFa9k11nnoS0MFuQI0Wo8HUHlL25ChFzzvO2LXlDznY0HxqsmcTl+blnq083z76pczRSrHwly1nr87sUUV6xpODDJ7G0U74xc5jVCkSBtC+QpA7y2IcUZNMcr5OrB1wu5L+pxHzFnkw9fgiEfYfhlg=',
	mode: 'capture',
	// ignore Svelte generated files
	excludeDirectories: ['./.svelte-kit'],
	logging: ['api-calls', 'capture', 'transform']
})
