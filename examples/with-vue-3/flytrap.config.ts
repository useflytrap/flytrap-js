import { defineFlytrapConfig } from 'useflytrap'

export default defineFlytrapConfig({
	projectId: 'vue-3-demo',
	publicApiKey:
		'pk_MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu8dBGiaFm/bRr0HgL6Pp9m/9ow/Ymk3n4r4IF9VPGHGJOStZeX3wClBphPuxmOiU4Z95JVY4frJro79Tcomy3dl7dWVi+2hRxg6b3/HVWP0FTbml2BM2HUNB/uoKm++UxPcdTVUhKtPIFsTcyxzigHm0+3yFh7dCRKPi72GECvn2Bg52bxGbl7MuZzEjKzWqafeu8IrsI1M5CqRdH9zF/n9le7EdazXz7sv7tNhE3ptmk2VdljCx+eM2oUE111tT7+flNWB95MwdNgHbY4jt7y7qNnS64Wp/Y6SwszmSajGu6OaiSit8RcEWPMlWmQv08WNcfiMk4+LIq/vf5/4mlQIDAQAB',
	secretApiKey: 'sk_Q4N3TB96flEAHFEViij1IRCvlXUt72WRzvG6MU7d9RIAHzjE',
	privateKey:
		'sk_MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7x0EaJoWb9tGvQeAvo+n2b/2jD9iaTefivggX1U8YcYk5K1l5ffAKUGmE+7GY6JThn3klVjh+smujv1NyibLd2Xt1ZWL7aFHGDpvf8dVY/QVNuaXYEzYdQ0H+6gqb75TE9x1NVSEq08gWxNzLHOKAebT7fIWHt0JEo+LvYYQK+fYGDnZvEZuXsy5nMSMrNapp967wiuwjUzkKpF0f3MX+f2V7sR1rNfPuy/u02ETem2aTZV2WMLH54zahQTXXW1Pv5+U1YH3kzB02AdtjiO3vLuo2dLrhan9jpLCzOZJqMa7o5qJKK3xFwRY8yVaZC/TxY1x+IyTj4sir+9/n/iaVAgMBAAECggEACW8KvcIWr024nhnspegRvoBE2VbX9nSYhEMwy+W7CgrWLomXfquNji8ZBgXRF9IDfMxSvUX2I6NaFglsK1JwqoWdFrpHvUKx7QXZ3efb5JMdm5iKlO7uJo00+RYP/2KLclPJ5JM0zd6C7GXqg8fJN1Ql/AZ2/Oj/isxC/+zBwf1Trnu8iPU/rMTadJJ6RKIT05hdg0kmuA14TkBbNyApvPWD/Kw247MYap+U33ipGsDQOgbQPFRDwoGPPQ0xZWDnCyRaacrLZ2ScFD0y48k3VzzWvkyq/dU+5D1TzEXwSedpK7fIUI84JR/YxFNEErGtjd+oKM70+ZXaR5tSX94JkQKBgQD0WLrmwX0WPOjJdRb8e3WiJCsEmyMPAwT2vEO50uVyX9pzZAFhTzmWzLizJPBcM5kwQsNe4rCn/TuFVtm9vSyE37ZW5EIdU8rM2yjj/KfohFh7m+Cb2sBgu6s5E0oX6gf5VZDnfR5TSsGU7x7RQjcJHCxAB9PzeKaKIaj2AJpD+QKBgQDEu99b10W1XYxycQnL8NdIj35wH8harjpnflaSUCnWY84Kw6jFaE0P1IRz08f8TqUk3zpKp3zEOM+Fi9aU3XlNQIZXN8tIkLFs5tutf9RMfJcQtPuCZMP0egF5DiuJmMuBoHqK/tlmYNDIyI0jab60HoT6SuoXwd1vhwzmKDQmfQKBgAZprb4Qpe/HeXSQFiJaOyQePuLID4t9UMwI9N4TouH1kg4lOcQMCD7k8JQDDCvfTs3tcqMy3+AIzV8agGxyYpC6LlbpdrK+WDw4JEKXhvCbSJc16BcvDo17X2sIDpHCGqN4k2z/46Pb+mimPfDQBBHBI4gqrG1fZT+K0pxiN6pBAoGAQXoV2MdJGBfOirg8fnfl7uxzNHYfhK7AGXne7ktn4UbOaJ6+KRWRsFcWzkYKJVs3c5IoIHil+di+mL/15w3fNWroS1byfXBK3Ofo7VHCIsLEtHbHzpoi7dc9bkDdFKqZ8Masgl5XlM9cLbcx4jtrkR8nOvZ7+vQ28suL634t/TECgYEAxfGz4MJ2O5iiXm+Cpm1H9+lmjmKKbruRcZ2/rMMXus2B1uGEoePJQY82oSxqtIrabh8AY2yKWQ4eA2NHlGVBoScs81qjRBsvkGYLeWzCmsKwfrD7mTVpz1U5rUOs6LMLAUDwkzwDtSf6/p75NpFnwadvBY1zRUAsqzJPnpHwZrg=',
	mode: 'capture',
	packageIgnores: ['vue'],
	logging: ['api-calls', 'capture', 'storage']
})
