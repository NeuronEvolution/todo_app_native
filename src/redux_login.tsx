import { AsyncStorage } from 'react-native';
import { REDUX_STORE } from '../App';
import { SERVER_IP } from '../ENV';
import { Dispatchable, StandardAction } from './_common/action';
import { getHeader } from './_react_native_common/fetchHelper';
import {
    DefaultApiFactory as AccountApi,
    loginParams, resetPasswordParams,
    smsCodeParams,
    smsLoginParams,
    smsSignupParams
} from './api/account-private/gen/';
import { AuthorizationCode, DefaultApiFactory as OauthPrivateApi } from './api/oauth-private/gen';
import {DefaultApiFactory as UserPrivateApi, OauthJumpResponse, Token } from './api/user-private/gen';
import { apiTodoGetUserProfile } from './redux';
import { onGlobalToast, TOAST_FAST, TOAST_SLOW } from './ToastView';

const STORAGE_KEY_USER_REFRESH_TOKEN = 'USER_REFRESH_TOKEN';

export const MAX_LOGIN_NAME_LENGTH = 24;
export const MAX_PHONE_LENGTH = 11;
export const MAX_PASSWORD_LENGTH = 20;
export const MAX_SMS_CODE_LENGTH = 6;

export const REQUIRE_LOGIN = 'REQUIRE_LOGIN';
export const ACTION_USER_OAUTH_JUMP_SUCCESS = 'ACTION_USER_OAUTH_JUMP_SUCCESS';
export const ACTION_USER_REFRESH_TOKEN = 'ACTION_USER_REFRESH_TOKEN';
export const ACTION_USER_LOGOUT_SUCCESS = 'ACTION_USER_LOGOUT_SUCCESS';

const accountApiHost = 'http://' + SERVER_IP + ':8080/api-private/v1/accounts';
const accountApi = AccountApi(undefined, fetch, accountApiHost);
const oauthPrivateApiHost = 'http://' + SERVER_IP + ':8080/api-private/v1/oauth';
const oauthPrivateApi = OauthPrivateApi(undefined, fetch, oauthPrivateApiHost);
const userPrivateApiHost = 'http://' + SERVER_IP + ':8080/api-private/v1/users';
const userPrivateApi = UserPrivateApi(undefined, fetch, userPrivateApiHost);

export const onApiError = (err: any, message: string): Dispatchable => (dispatch) => {
    const status = err && err.status ? err.status : 0;
    if (status === 401) {
        return; // skip Unauthorized error
    }

    const errString = err.toString();
    const text = (errString === 'TypeError: Network request failed' || errString === 'TypeError: Failed to fetch') ?
        '网络连接失败' + (message ? ':' : '') + message : (err.message ? err.message : err.toString());

    dispatch(onGlobalToast(text, TOAST_SLOW));
};

const onAccountLoginSuccess = (jwt: string): Dispatchable => (dispatch) => {
    return userPrivateApi.oauthState('fromApp', getHeader())
        .then((state: string) => {
            return oauthPrivateApi.authorize(jwt, 'code', '100002', 'fromApp', 'BASIC', state, getHeader())
                .then((authorizationCode: AuthorizationCode) => {
                    const authCode = authorizationCode.code;
                    if (authCode === undefined) {
                        return dispatch(onApiError('oauthPrivateApi.authorize code is null', ''));
                    }
                    return userPrivateApi.oauthJump('fromApp', authCode, state, getHeader())
                        .then((oauthJumpResponseData: OauthJumpResponse) => {
                            dispatch(onGlobalToast('登录成功', TOAST_FAST));
                            dispatch({type: ACTION_USER_OAUTH_JUMP_SUCCESS, payload: oauthJumpResponseData});
                            dispatch(saveUserRefreshToken(oauthJumpResponseData.token.refreshToken));
                            dispatch(apiTodoGetUserProfile());
                        }).catch((err) => {
                            dispatch(onApiError(err, userPrivateApiHost + '/oauthJump'));
                        });
                }).catch((err) => {
                    dispatch(onApiError(err, oauthPrivateApiHost + '/authorize'));
                });
        }).catch((err) => {
            dispatch(onApiError(err, userPrivateApiHost + '/oauthState'));
        });
};

export const apiUserLogout = (): Dispatchable => (dispatch) => {
    const t: Token = REDUX_STORE.getState().token;
    return userPrivateApi.logout(t.accessToken, t.refreshToken, getHeader())
        .then(() => {
            dispatch(onGlobalToast('您已退出登录', TOAST_FAST));
            dispatch({type: ACTION_USER_LOGOUT_SUCCESS});
            dispatch(saveUserRefreshToken(''));
        }).catch((err) => {
            dispatch(onApiError(err, userPrivateApiHost + '/logout'));
        });
};

export const apiAccountSmsCode = (p: smsCodeParams): Dispatchable => (dispatch) => {
    return accountApi.smsCode(p.scene, p.phone, p.captchaId, p.captchaCode, getHeader())
        .then(() => {
            dispatch(onGlobalToast('已发送', TOAST_FAST));
        }).catch((err) => {
            dispatch(onApiError(err, accountApiHost + '/smsCode'));
        });
};

export const apiAccountSmsLogin = (p: smsLoginParams): Dispatchable => (dispatch) => {
    return accountApi.smsLogin(p.phone, p.smsCode, getHeader())
        .then((jwt: string) => {
            dispatch(onAccountLoginSuccess(jwt));
        }).catch((err) => {
            dispatch(onApiError(err, accountApiHost + '/smsLogin'));
        });
};

export const apiAccountLogin = (p: loginParams): Dispatchable => (dispatch) => {
    return accountApi.login(p.name, p.password, getHeader())
        .then((jwt: string) => {
            dispatch(onAccountLoginSuccess(jwt));
        }).catch((err) => {
            dispatch(onApiError(err, accountApiHost + '/login'));
        });
};

export const apiAccountSmsSignup = (p: smsSignupParams): Dispatchable => (dispatch) => {
    return accountApi.smsSignup(p.phone, p.smsCode, p.password, getHeader())
        .then((jwt: string) => {
            dispatch(onAccountLoginSuccess(jwt));
        })
        .catch((err) => {
            dispatch(onApiError(err, accountApiHost + '/smsSignup'));
        });
};

export const apiAccountResetPassword = (p: resetPasswordParams, onSuccess: () => void): Dispatchable => (dispatch) => {
    return accountApi.resetPassword(p.phone, p.smsCode, p.newPassword, getHeader())
        .then(() => {
            dispatch(onGlobalToast('密码重置成功', TOAST_FAST));
            onSuccess();
        }).catch((err) => {
            dispatch(onApiError(err, accountApiHost + '/resetPassword'));
        });
};

const saveUserRefreshToken = (refreshToken: string): Dispatchable => (dispatch) => {
    AsyncStorage.setItem(STORAGE_KEY_USER_REFRESH_TOKEN, refreshToken)
        .then()
        .catch((err) => {
            dispatch(onApiError(err, 'saveUserRefreshToken#AsyncStorage.setItem'));
        });
};

export const autoLogin = (): Dispatchable => (dispatch) => {
    AsyncStorage.getItem(STORAGE_KEY_USER_REFRESH_TOKEN)
        .then((refreshToken: string) => {
            if (!refreshToken || refreshToken === '') {
                return;
            }

            userPrivateApi.refreshToken(refreshToken, getHeader())
                .then((data: Token) => {
                    dispatch({type: ACTION_USER_REFRESH_TOKEN, payload: data});
                    dispatch(saveUserRefreshToken(data.refreshToken));
                    dispatch(onGlobalToast('登录成功', TOAST_FAST));
                })
                .catch((err) => {
                    console.log('autoLogin', 'userPrivateApi.refreshToken', err); // todo: more
                });
        })
        .catch((err) => {
            dispatch(onApiError(err, 'autoLogin#AsyncStorage.getItem'));
        });
};

const refreshUserToken = (refreshToken: string): Promise<void> => {
    return userPrivateApi.refreshToken(refreshToken, getHeader())
        .then((data: Token) => {
            REDUX_STORE.dispatch({type: ACTION_USER_REFRESH_TOKEN, payload: data});
            REDUX_STORE.dispatch(saveUserRefreshToken(data.refreshToken));
        })
        .catch((err) => {
            REDUX_STORE.dispatch(onApiError(err, userPrivateApiHost + ' refreshToken'));
        });
};

const isUnauthorizedError = (err: any): boolean => {
    const status = err && err.status;
    return status === 401;
};

export const apiCall = (f: () => Promise<any>): void => {
    f().then(() => {
        console.log('apiCall progress end'); // todo 防止同时刷新
    }).catch((err) => {
        if (!isUnauthorizedError(err)) {
            REDUX_STORE.dispatch(onApiError(err, ''));
            return;
        }

        const refreshToken = REDUX_STORE.getState().token.refreshToken;
        if (!refreshToken) {
            REDUX_STORE.dispatch({type: REQUIRE_LOGIN});
            return null;
        }

        return refreshUserToken(refreshToken).then(() => { // FIXME action可能还没执行
            return f().catch((errAgain: any) => {
                if (!isUnauthorizedError(errAgain)) {
                    REDUX_STORE.dispatch(onApiError(errAgain, ''));
                    return;
                }

                REDUX_STORE.dispatch({type: REQUIRE_LOGIN});
            });
        });
    });
};

const initialToken: Token = {accessToken: '', refreshToken: ''};
export const token = (state: Token = initialToken, action: StandardAction): Token => {
    switch (action.type) {
        case ACTION_USER_OAUTH_JUMP_SUCCESS:
            return action.payload.token;
        case ACTION_USER_REFRESH_TOKEN:
            return action.payload;
        case REQUIRE_LOGIN:
            return initialToken;
        case ACTION_USER_LOGOUT_SUCCESS:
            return initialToken;
        default:
            return state;
    }
};

export const userID = (state: string= '', action: StandardAction): string => {
    switch (action.type) {
        case  ACTION_USER_OAUTH_JUMP_SUCCESS:
            return action.payload.userID;
        default:
            return state;
    }
};

export const getAccessToken = (): string => {
    const t = REDUX_STORE.getState().token;
    return t && t.accessToken ? t.accessToken : '';
};