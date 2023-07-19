import { defineFlytrapConfig } from 'useflytrap'

export default defineFlytrapConfig({
	projectId: 'nextjs-api-demo',
	publicApiKey:
		'pk_MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnt6zYmam4kM9MLb3CKHg4pMmilMmAOYTIveVasJdV+9w8X1RSiPlWwbNEjbGfYBE+gNgM/JXMMr6ThqMvjooORUpbEFfwvflNwRbwU5xi2RQ7slTAheQhgh0QDpckuTFTn7M0lJ89P3Ah9r3BBJkPgiB4mO/832YZGlYZFmYpuS3rNyoPToW2Vabw77nv4z1UM92fXW6DREjLjeTB8htJu8qfhjKWozLbweK7LysOoGS98c0vKQvkata0Ifj7VNrT82U/PteFWm/2KLbPSTMO2y1UEJLLspBBvtegVwRzwzYdOulxiPNaQ5mKX67f/IZOvnOzpnPRavr2GMoREBgawIDAQAB',
	secretApiKey: 'sk_3X-otNR_ZxIdw8cVxNbFcDivQF9B5Vw_bGu564jR35GMyVXX',
	privateKey:
		'sk_MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCe3rNiZqbiQz0wtvcIoeDikyaKUyYA5hMi95Vqwl1X73DxfVFKI+VbBs0SNsZ9gET6A2Az8lcwyvpOGoy+Oig5FSlsQV/C9+U3BFvBTnGLZFDuyVMCF5CGCHRAOlyS5MVOfszSUnz0/cCH2vcEEmQ+CIHiY7/zfZhkaVhkWZim5Les3Kg9OhbZVpvDvue/jPVQz3Z9dboNESMuN5MHyG0m7yp+GMpajMtvB4rsvKw6gZL3xzS8pC+Rq1rQh+PtU2tPzZT8+14Vab/Yots9JMw7bLVQQksuykEG+16BXBHPDNh066XGI81pDmYpfrt/8hk6+c7Omc9Fq+vYYyhEQGBrAgMBAAECggEAPqP/pfZkqcUqTNlviQNO6PdtVFAZpXQSKpDlZK1TYbdC2Kz5Ttrddak2VY6sb9KSH+QR3BmbIF2AGSilwuGqd2ttJEaYjAbzZWB+DzevVG9O7AAMj0AcV4Tg1WxNkQvL8jnT57/nji+5aLfA+uWHieAP2mRLTKYCXuEcnaCoLHFWIxGiQ9te/J11V+OxxEPMH3auBdx3lMQ44njJNhnEGskz/5jYc+ilRMKVFkyDer/smv0BpykdNpxXExpoqhgIOZ9N4Io5QJTaBxv5b0WZbUgoxGahH5Gzs+FPoYvb/jxjjVka50HRHNtePwmA4yAamdVJsoB4P6RDOnAV4uKXUQKBgQDK78UQ73f8jjQ82vienXSHLCXcuAr1ov2J3HA4MDWwzDjnypvr2kIHnE1p7dwJINeu4SYhctDpqPiA8DYg+2FLbUc8aU3BF2IkRiQR9aC0+j1bEjNI3fOKc18BtK0WOBzVeysKoinRfT7zQsLmxlgJjd6x1YSI1bPKxAcELpZFkQKBgQDIaS7Ho8YWO1aUpqKxiGYRJ3kbPAhm5ADKApS/mgRG7AsmdBhJ3rL77Az3mca6TLcJ9WAfxj+rxlX/HfDOAE8T/rl9k2omLOxSrCi9Oud0kvnJBquF/yhnLTzGf3vfXmeii02sWajzng5WRW57vVyPzZoLn4IJL8rERPmeSCzYOwKBgQChElgWzgstMO1zU9W7h3wDAd53ZriEKL8WGhoT7ufekOmlyGGjfJOmGMA1EK7xq9ilHF04dTouC4haRs6ftQaPaIf/AhHN7bJe2jEs9Al/O5NRYovEDS6NOG8zGmW7WgRAyUbrZLTOapt5Vwb9RnZ/9tPH0JImTYArsxVik1uAkQKBgQC8UEF5rAU87KLtaSrk4MLviYS9t4o5jDLFnulApKsyLShJCLut5cmO+H4yxlc6xU0U2XFqSfGYKfSylOKp3xZvNmH7gmIy3vFsuYJKVSgZnOWDJHZVoa3ITXSXHEE8YUvGK1lgApvD1peoLvOi6AsqwMnn9AjPMw43oIxhU3Z38wKBgE8+bku3tQvnwSSh1bwf0GEoa/gwlVXmzpEjntr66ysX+U9ysTJ/BH2DdjjBmvWbTaUpN+SwZq/FhBmIyyTFJ2LiuHAjuuZ2gWXVkl4+oOnhmHVW7xkEsN9BEpFAiGSNojkK4UH0V9pdV1ButZKCYjLz1aSPl8uBMyDFEvPZb9fo',
	mode: 'capture',
	packageIgnores: ['next/font'],
	logging: ['api-calls', 'capture', 'storage']
})
