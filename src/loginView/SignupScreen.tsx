import * as React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { connect } from 'react-redux';
import { Dispatchable } from '../_common/action';
import { checkPhone } from '../_common/common';
import { countdown } from '../_common/countdown';
import { fastClick } from '../_common/fastClick';
import { smsCodeParams, smsSignupParams } from '../api/account-private/gen';
import { commonStyles } from '../commonStyles';
import { apiAccountSmsCode, apiAccountSmsSignup } from '../redux_login';
import ToastView, { onGlobalToast } from '../ToastView';

export interface Props {
    onGlobalToast: (text: string) => Dispatchable;
    apiAccountSmsSignup: (p: smsSignupParams) => Dispatchable;
    apiAccountSmsCode: (p: smsCodeParams) => Dispatchable;
}

interface State {
    signupPhone: string;
    signupSmsCode: string;
    signupPassword: string;
    smsCodeCountdown: number;
}
const initialState = {
    signupPhone: '',
    signupSmsCode: '',
    signupPassword: '',
    smsCodeCountdown: 0
};

class SignupScreen extends React.Component<Props, State> {
    private static renderTitle(): JSX.Element {
        return (<Text style={[commonStyles.text, styles.title]}>注册火星帐号</Text>);
    }

    public componentWillMount() {
        this.onPhoneChanged = this.onPhoneChanged.bind(this);
        this.onSmsCodeChanged = this.onSmsCodeChanged.bind(this);
        this.onGetSmsCodePressed = this.onGetSmsCodePressed.bind(this);
        this.onPasswordChanged = this.onPasswordChanged.bind(this);
        this.onSignupPressed = this.onSignupPressed.bind(this);

        this.setState(initialState);
    }

    public render() {
        return (
            <View style={[commonStyles.screenCentered]}>
                {SignupScreen.renderTitle()}
                {this.renderPhone()}
                {this.renderSmsCode()}
                {this.renderPassword()}
                {this.renderSignupButton()}
                <ToastView/>
            </View>
        );
    }

    private renderPhone(): JSX.Element {
        return (
            <View style={[commonStyles.flexRowCentered]}>
                <Text style={[commonStyles.text, {width: 72}]}>手机号</Text>
                <TextInput
                    underlineColorAndroid={'transparent'}
                    style={[commonStyles.textInput, {width: 180}]}
                    onChangeText={this.onPhoneChanged}
                    value={this.state.signupPhone}
                    placeholder={'请输入手机号'}/>
            </View>
        );
    }

    private renderSmsCode(): JSX.Element {
        const {smsCodeCountdown} = this.state;
        const disabled = smsCodeCountdown > 0;
        const color = disabled ? '#888' : '#0088FF';

        return (
            <View style={[commonStyles.flexRowCentered]}>
                <Text style={[commonStyles.text, {width: 72}]}>验证码</Text>
                <TextInput
                    underlineColorAndroid={'transparent'}
                    style={[commonStyles.textInput, {width: 60}]}
                    onChangeText={this.onSmsCodeChanged}
                    value={this.state.signupSmsCode}/>
                <TouchableOpacity
                    disabled={disabled}
                    style={[commonStyles.button, {width: 120, backgroundColor: '#fff'}]}
                    onPress={this.onGetSmsCodePressed}>
                    <Text style={[commonStyles.text, {color}]}>
                        {disabled ? smsCodeCountdown + '秒后重新发送' : '发送短信验证码'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    private renderPassword(): JSX.Element {
        return (
            <View style={[commonStyles.flexRowCentered]}>
                <Text style={[commonStyles.text, {width: 72}]}>密码</Text>
                <TextInput
                    underlineColorAndroid={'transparent'}
                    style={[commonStyles.textInput, {width: 180}]}
                    onChangeText={this.onPasswordChanged}
                    value={this.state.signupPassword}
                    placeholder={'请输入登录密码'}
                />
            </View>
        );
    }

    private renderSignupButton(): JSX.Element {
        return (
            <TouchableOpacity
                style={[commonStyles.windowButton, {marginTop: 12}]}
                onPress={this.onSignupPressed}>
                <Text style={[commonStyles.buttonText]}>注册并登录</Text>
            </TouchableOpacity>
        );
    }

    private onPhoneChanged(text: string) {
        this.setState({signupPhone: text});
    }

    private onSmsCodeChanged(text: string) {
        this.setState({signupSmsCode: text});
    }

    private onPasswordChanged(text: string) {
        this.setState({signupPassword: text});
    }

    private onGetSmsCodePressed() {
        const phone = this.state.signupPhone;
        if (phone === '') {
            return this.props.onGlobalToast('请输入手机号');
        }

        if (!checkPhone(phone)) {
            return this.props.onGlobalToast('手机号格式不正确');
        }

        if (fastClick()) {
            return;
        }

        const COUNT_DOWN_SECONDS = 60;
        countdown(COUNT_DOWN_SECONDS, (n: number) => {
            this.setState({smsCodeCountdown: n});
        });

        this.props.apiAccountSmsCode({
            scene: 'SMS_SIGNUP',
            phone
        });
    }

    private onSignupPressed() {
        const {signupPhone, signupSmsCode, signupPassword} = this.state;

        if (signupPhone === '') {
            return this.props.onGlobalToast('请输入手机号');
        }

        if (signupSmsCode === '') {
            return this.props.onGlobalToast('请输入验证码');
        }

        if (signupPassword === '') {
            return this.props.onGlobalToast('请输入登录密码');
        }

        if (fastClick()) {
            return;
        }

        this.props.apiAccountSmsSignup({
            phone: signupPhone,
            smsCode: signupSmsCode,
            password: signupPassword
        });
    }
}

export default connect(null, {
    onGlobalToast,
    apiAccountSmsSignup,
    apiAccountSmsCode,
})(SignupScreen);

const styles = StyleSheet.create({
    title: {
        fontSize: 32,
        marginTop: 48,
        marginBottom: 12
    }
});