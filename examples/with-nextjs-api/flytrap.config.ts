import { defineFlytrapConfig } from "useflytrap"

export default defineFlytrapConfig({
	projectId: 'nextjs-api-demo',
	publicApiKey: 'pk_MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu4exyVpW0JoHbSr/8r3jq053yV/WQN0xaU7bOfdW6mNeACJXhO3/T39vFeUpR8bQYtcF6OM833+MTpTGiA+nzd/UkLtabuiss6go86oUINP21HE5IKTAuA7LY2JUr/Jv9h5ATXJsHEBqtuefVfHIi8aMMNq+lgwNJ7llprse+/FXtqrFVDRdlD3SlO9I5xqHZ/28xzB0l0gNgGH7vSP2MiQ6Eox/qwWlQD3REmfp+kDNjF5bSQI6e19bFe187WNLHsqKhzdx5tnjcJCkLkhmIPoD5bIOlo/VHioVeBJ3FHDoDJyTud83Th5yaabEEesNTVyZSiAYoqPUO5xoJNlCIQIDAQAB',
	secretApiKey: 'sk_BxQGJA-zs0l_moCLrINFw9YOc_0Ul433KEoCHSpZiIvvDj5a',
	privateKey: 'sk_MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7h7HJWlbQmgdtKv/yveOrTnfJX9ZA3TFpTts591bqY14AIleE7f9Pf28V5SlHxtBi1wXo4zzff4xOlMaID6fN39SQu1pu6KyzqCjzqhQg0/bUcTkgpMC4DstjYlSv8m/2HkBNcmwcQGq2559V8ciLxoww2r6WDA0nuWWmux778Ve2qsVUNF2UPdKU70jnGodn/bzHMHSXSA2AYfu9I/YyJDoSjH+rBaVAPdESZ+n6QM2MXltJAjp7X1sV7XztY0seyoqHN3Hm2eNwkKQuSGYg+gPlsg6Wj9UeKhV4EncUcOgMnJO53zdOHnJppsQR6w1NXJlKIBiio9Q7nGgk2UIhAgMBAAECggEAA8c+CKzvswK+HmU0zxwj0OZYaVUrZixUC/Iz3l+ydNpSgRqwBuSGVcCfHpgQJEXSxNcJDlzmXlNod9yCq9Ly7NCIbMUVk0alVMumeD2nllS8SaH2sRwYqkIEDN56OdRJjLIl1gRK6NPPF/HOkZxOOoC3f4l8uF20SyYEBgoJm7EDi5Bkl/jMugkvNvcGTMO4qD/wAZYXoCL/pTsi+BkdzGbAuwtRyHahkCf2aJbq+Cpu26HKYS6tdIsTC+AadfF46a/ObvYZHsZWnSvgTApeR+JLuI02tXpIeW/4HzHej+ZXltTJv99d4BVGGo9XfBG6wncj3LxEfxSa1XTLmh4h0QKBgQDbjP0cm4IRveGjXNzBHH7IOCoNh3PDR7wvlNrUIi6JFD8Ahv6uvfutvdYSVoJld5qYQ1nSdva5QqD8Wwa2Qm0KP4/GE0d4TWdS7yhhcneuJ1/dJ11D+MbMRFrmQHTXJeP3hcPh8oU9b4q8/Py/AIojyl9IgGoBmjTUJ2TPC59m2QKBgQDaqc/ARYVsZGzoBUdDLuuK+X2FTVJfvZSZ7/b7ztY7Xg8kOb5qhQHytCVtGeWBlgHskXuz4gM8/5N9SrKfTS+zmdO/DZywQd7/C+cgtUGKvH/gbXbhMshAkG/2bXeTJfhE+b47B40UXBWOAKLWcPerYme1FFRILZ9XT/SBQJH4iQKBgGl+CzituAfSVxLp0eCwUnLeGca6aPNSCqhKPANmETookkUsmD9aZg4Lg0r4alta5tt2sTghlVdbHoNjMYxtynr8I5cnOFYjyxvccmiwWbVCkhtviK7aYJtR1OOB4SJnwGv0yDRPFZp5eA5q+P7FwZqE6NerbEQs1mmCLDwX95WxAoGAAcj3GDO5Fhxvwykf3s2IQLcuriLmdD+g8ezCkGWs3Ak1iG8sPcReMrQDxjM662blFyBM6TgEHMBdXN16PdCsfgPYdavPxqSTBHP9bAfuxAor5RIfsVDvz48eSt2z5zCdKTr8sZCrNypVRrZ8ndGIRA7ml9TVp00wCs9tSIzVZDkCgYEAkfdtQcqjTgh0R+573iXBiEwPQhJNsLB4JQQIhhcjbZeHmWqqToe8Xp5/xeetbVixe2ne96JwVWIHjhqbGnMJrxCQfHKXOyeYcWbdqCwsA3/mDgw408HCpmwGG1dRv/ToDRc3vZV25Qi6ygzP9UZsFdZ+3Ku57jNAGcl/gDwbCLk=',
	mode: 'capture',
	packageIgnores: ['next/font'],
	logging: ['api-calls', 'capture', 'storage']
})
