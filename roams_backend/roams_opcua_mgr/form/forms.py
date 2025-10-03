from django import forms
from roams_opcua_mgr.models import AuthenticationSetting
#authentication setting forms for opcua password
class AuthenticationsettingForm(forms.ModelForm):
    class Meta:
        model = AuthenticationSetting
        fields = '__all__'

    def clean(self):
        cleaned_data = super().clean()
        Anonymous = cleaned_data.get('active')  # Check the 'active' field
        username = cleaned_data.get('username')
        password = cleaned_data.get('password')

        # Conditional validation logic based on the 'active' field
        if not Anonymous:  # If 'Anonymous' is False (Anonymous)
            if username or password:
                raise forms.ValidationError(
                    "If 'Anonymous Authentication' is selected, username and password must be empty."
                )
        else:  # If 'Anonymous' is True (Authenticated)
            if not username or not password:
                raise forms.ValidationError(
                    "If 'Anonymous Authentication' is not selected, both username and password are required."
                )

        return cleaned_data
        

# OPCUAnodes forms to allow additional tags to choices

