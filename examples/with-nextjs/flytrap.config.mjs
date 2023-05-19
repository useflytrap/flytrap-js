import { defineFlytrapConfig } from 'useflytrap'

export default defineFlytrapConfig({
	projectId: 'nextjs-demo',
	publicApiKey: 'pk_MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsTAnbcqXBFwKQhf8htpo+dH1r5iIXpr4xrZofn60J4nJGtdkVYXNj+pjlbooZIDBxrVLHKrYwI3TOFgM3KSLQS7YOFyS7a29kqGLUPGnO809pTTDEP66ho7/e+8jdjiyBDNTv6lwS3rxYteHcN7UQERA69gqvessNUNiCJlpL9JxBKnU+KDFXoV8IdUKiJqJUkZ2OT0vf0xMWUXQkdF8/+gFlJJpQlMe7OM9Owjyyl39ceoJ27yR559IVwmAXgIh4rXfb9/tBmq224+k73ohhciLPFBpRhJBp6AI+lTyFZI6GkHQBWyjmTyeEtJ1aDtdoKMSwIc7qOVvnJ9OUZVtsQIDAQAB',
	privateKey: 'sk_MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCxMCdtypcEXApCF/yG2mj50fWvmIhemvjGtmh+frQnicka12RVhc2P6mOVuihkgMHGtUscqtjAjdM4WAzcpItBLtg4XJLtrb2SoYtQ8ac7zT2lNMMQ/rqGjv977yN2OLIEM1O/qXBLevFi14dw3tRAREDr2Cq96yw1Q2IImWkv0nEEqdT4oMVehXwh1QqImolSRnY5PS9/TExZRdCR0Xz/6AWUkmlCUx7s4z07CPLKXf1x6gnbvJHnn0hXCYBeAiHitd9v3+0Garbbj6TveiGFyIs8UGlGEkGnoAj6VPIVkjoaQdAFbKOZPJ4S0nVoO12goxLAhzuo5W+cn05RlW2xAgMBAAECggEAA4bIgxyztvVPajTiDJZLsxyq2SfwqgwyLeTJoBUMyCcWXMGV5xvuEop3rnjtdsDHXTQZ+AqoXJk6BOfKOOjmDAn2/qoCLdyIo/gRfsl8zUcKrlIA8k1f6Eo6bcoC4fveAvvD86ynSLD28s4EuDeEII5nNHZ0Kn0JWhryqEaINO3wytPVnEWM8rPrQeaDtVDhQDrJIbxCZDL3iqzYzopx3C5KkGNkrgaWsGco+e1fOoxd0HPlsey41NHVq1lCiY0A7AvKTjdq2kj+XdMHtKfEo9mThRX0iQ7piHc71D+WGjAYkttvlEhIEN3nnU1qWX05S4blkIpxNdaUA5vet2cf4QKBgQDMeh76S+0/zIYtlfoTRrbo/Q3YLaG09ftkJa5k65j2v5zC5ftP8/VpRxwRgZE3YD7aCPTVASA/bUZA6ZI4fwmP9M7nWKXEvL5NleRLQhPMbiD+1jyJVGgtjrLHS5FESfSP8tsPFdzOHmZ4duiJdLu7VCgDMSeHEBtzPxiLXbDyEQKBgQDd1b+mS7sSWGYiIbQ5EXvzwc1VCunEk95b8zBq0Ref1+Ad5FSXoZqHvD05SmL1ahhDZmXH5FRuNWjZ26RjEguRcwfq734mXf4cGhLbtCr5OqltHquhPAXGHz6wmt001W1S4+motRG9Ckis+8mr6/5M6ScvJ50FnJ7zaSpnW4khoQKBgBk8GQaayDTPcN+/WpV2bKxkTokXWJWUpem+HL+ns8D/9MC40UMUwHy1oeknLFzBLACMimqfMPOi8MCiEsGWK//wHni+n/aftHyuuvXuubLJBJlupxnrqM+2hKnD0bGzztLVDePWtuFZLxw+0IPmPCTqReXe8xngCwM2Djlk3qmBAoGBANHZXg7GHRVholwvXfmOXJ9eegs046cd6n85MlgZrCt9X3lngc5fBXvZymDjyXE3B/TabPYHPQd0ZteQO5WsgFz7YEYSgFdzGusijyxe5zgVEikzllBUI3IkJH2UQiW0sFJ1X5hEkZ8ul0lsdn64JDxFYtfstVGVs5e3qHFV2geBAoGAX3Eudu71lcF6j53ZEpHVMUr/WioTkyZn1nUrAN3NZtGsVfBrhGwjhhHSi9xnQGyJQctAs5mKoiVzGQ1jtVuXlaXjiNtidj8jgbrnnsh9aFoZmD6HduRjDnZdWWQdZ8UnoyWNzXg+K42v4JFNeiA6ChaMr8lCgzx0tz3RvAnqu3c=',
	secretApiKey: 'sk_79wqa4szRnj2VBPJxhrRmgTf0mD1q4pcR5FijW_neVCf8Oro',
	mode: 'capture',
	logging: ['api-calls', 'capture', 'storage'],
	packageIgnores: ['next/font']
})
