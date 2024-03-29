import { defineFlytrapConfig } from 'useflytrap'

export default defineFlytrapConfig({
	projectId: 'express-api-demo',
	publicApiKey:
		'pk_MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoc+4JjU8eU34f3cExCl75uCjGcLkbwG6zEuI2ZCVpAvIWptMZyGivOK1BM004OBZ/k+MvGdZ6rV43AqgJLoDOoPNGziYX00St1vn4hz+peenQ7oMmB1yPqx7tGLSuMHtwWErShBKN2dJBMoSmQayt5bf0SbMblBY+NRLJTnGgMN7AzkHt4Lkt06lsl1mxrOVf54TgSNhGfKeRE/2tFq58cwsnVKHPNOp1z/JR5Z1YOeHDxgFT2shNztd+R36T+VSNAOq46DbX3eEWnrnN4Z8bnAvQuPa/4bKoHm0Zc+lIHtiH8cY3RMeZXd3HQKilHRxNMmKhFc5rbT5NKaxEbQCPwIDAQAB',
	secretApiKey: 'sk_BFcD8-vZvaB-hrPfonY9ZRrREkdSqdwMSRGjcOfsbdNynbbH',
	privateKey:
		'sk_MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQChz7gmNTx5Tfh/dwTEKXvm4KMZwuRvAbrMS4jZkJWkC8ham0xnIaK84rUEzTTg4Fn+T4y8Z1nqtXjcCqAkugM6g80bOJhfTRK3W+fiHP6l56dDugyYHXI+rHu0YtK4we3BYStKEEo3Z0kEyhKZBrK3lt/RJsxuUFj41EslOcaAw3sDOQe3guS3TqWyXWbGs5V/nhOBI2EZ8p5ET/a0WrnxzCydUoc806nXP8lHlnVg54cPGAVPayE3O135HfpP5VI0A6rjoNtfd4Raeuc3hnxucC9C49r/hsqgebRlz6Uge2IfxxjdEx5ld3cdAqKUdHE0yYqEVzmttPk0prERtAI/AgMBAAECggEABDVbVD8RNhR1kJcfXBy6GLyh8VMUzuBMI/EY+5ObmLsnuFeOqqYAzgnVbG0L4YdkP82A2wuTFpwmqw5psNrXp6dy57DWoa/m+zbcNpDLfLQkMQo/NpuZc5DX3M6vLVf534wv7Iq063D3wLSivDEk58p4Qr/QFFRpo/sdgzfX9lRUksCC9xLDaCEyDNvI2v4jas4v0edSoka0MQiXnaYlyVA9NlDIcjgHJNiYYNqYhktznDe63BSWN7nE9Xghbi5Ww8zxOKvK+mrOKiGfHEnRKcKSmF9bUlraCBTsVaTKGHmcMNi+SabgBkc9GurTDoHaS2GNblCP6DBJjKOx1nGsAQKBgQDiQKI/UQMw8cPXr9yzSQuEdZnPXgStM85llhv3Bcf1sK7i5C/JA9o61M9RIrai/7qbWruOpBzY28KQdzVvbyi5aiUK5Jb9AEv+hBjgj7DZKDlJUZ0fO1s4Io8F2D/zTAz19Lp/kLaeL12ZNog8xa1xyziKW9RsMcIjuNRbbriWPwKBgQC3FhUPgL92DzID2FLvmb47s6QzTWCOQuiZvjscQcuy1ozgNL5NIPKe3TsxaXCy7lu4KejOG86ALmqoOW2NKLZyeA9IkXjph4daJDa8GXbzKgSuYVNlOYSnAL1WOxaHqV7tkFzbBb9Mv3xozaHTn1SoRERbRNKruoyEsS2A8iGUAQKBgQCfwSmO8aICNkOlkUyR31rdjbgsPuOodLMg8cwPMSrO5ZGnLZ48HpdCAS/dx1gUYeOefIOApYqk6Q9JuJKne2LTAQrk1SFzxXjjXty9+1fRDeDdT15VRjETwvsgEmCdZy6joMjq+ACqUyGQ5HtwBdiBSBBFSbAFMWE2nfR8FwMJOwKBgGZJ8RRLQyzrim75gkSZKd5jHD8JYQO6QAf9bzr3S54sHmL5NMUUvlihk3ukxDFD2HyI9aeJg5K73B0GkL1H3L8RcsCBfgNDFAz5pJbsxzdN53WhrJ0mSIWhdSbjNlAvAXlKqYY4rMttRE2tbVc1cm/cTDCNwAHv5KgR8TFUlgwBAoGAUlG+5yAVPkWtP90wT7HBhVeRFl5ZGG9PI79Sdc7u/W0ksjJS+fhI5qbrHDMW4Son2/TM4qNLLyY3nSsdV8LgRAcbYBUXUvtW9dHi68ofND4Yqcg79cxLISg2Div5ldakslYIRRIsEfBALCJTKTxSDWAyXD8AaRXiVg5mIcYIlAw=',
	mode: 'capture',
	logging: ['error', 'api-calls', 'capture', 'storage']
})
