import { REDUX_STORE } from '../App';
import { SERVER_IP } from '../ENV';
import { Dispatchable, StandardAction } from './_common/action';
import * as actions from './actions';
import {
    DefaultApiFactory as AccountApi,
    loginParams, resetPasswordParams,
    smsCodeParams,
    smsLoginParams,
    smsSignupParams
} from './api/account-private/gen/';
import { AuthorizationCode, DefaultApiFactory as OauthPrivateApi } from './api/oauth-private/gen';
import {DefaultApiFactory as UserPrivateApi, OauthJumpResponse, Token } from './api/user-private/gen';
import { apiTodoGetUserProfile, onGlobalToast } from './redux';

const accountApiHost = 'http://' + SERVER_IP + ':8083/api-private/v1/accounts';
const accountApi = AccountApi(undefined, fetch, accountApiHost);
const oauthPrivateApiHost = 'http://' + SERVER_IP + ':8085/api-private/v1/oauth';
const oauthPrivateApi = OauthPrivateApi(undefined, fetch, oauthPrivateApiHost);
const userPrivateApiHost = 'http://' + SERVER_IP + ':8086/api-private/v1/users';
const userPrivateApi = UserPrivateApi(undefined, fetch, userPrivateApiHost);

export const onApiError = (err: any, message: string): Dispatchable => (dispatch) => {
    const status = err && err.status ? err.status : 0;
    if (status === 401) {
        return; // skip Unauthorized error
    }

    const text = err.toString() === 'TypeError: Network request failed'
        ? '网络连接失败:' + message : (err.message ? err.message : err.toString());
    dispatch(onGlobalToast(text));
};

const onAccountLoginSuccess = (jwt: string): Dispatchable => (dispatch) => {
    return userPrivateApi.oauthState('fromApp')
        .then((state: string) => {
            return oauthPrivateApi.authorize(jwt, 'code', '100002', 'fromApp', 'BASIC', state)
                .then((authorizationCode: AuthorizationCode) => {
                    if (authorizationCode.code === undefined) {
                        return dispatch(onApiError('oauthPrivateApi.authorize code is null', ''));
                    }
                    return userPrivateApi.oauthJump('fromApp', authorizationCode.code, state)
                        .then((oauthJumpResponseData: OauthJumpResponse) => {
                            dispatch(onGlobalToast('登录成功'));
                            dispatch({type: actions.ACTION_USER_OAUTH_JUMP_SUCCESS, payload: oauthJumpResponseData});
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
    return userPrivateApi.logout(t.accessToken, t.refreshToken).then(() => {
        dispatch({type: actions.ACTION_USER_LOGOUT_SUCCESS});
    }).catch((err) => {
        dispatch(onApiError(err, userPrivateApiHost + '/logout'));
    });
};

export const apiAccountSmsCode = (p: smsCodeParams): Dispatchable => (dispatch) => {
    return accountApi.smsCode(p.scene, p.phone, p.captchaId, p.captchaCode)
        .then(() => {
            dispatch(onGlobalToast('已发送,验证码1234'));
        }).catch((err) => {
            dispatch(onApiError(err, accountApiHost + '/smsCode'));
        });
};

export const apiAccountSmsLogin = (p: smsLoginParams): Dispatchable => (dispatch) => {
    return accountApi.smsLogin(p.phone, p.smsCode)
        .then((jwt: string) => {
            dispatch(onAccountLoginSuccess(jwt));
        }).catch((err) => {
            dispatch(onApiError(err, accountApiHost + '/smsLogin'));
        });
};

export const apiAccountLogin = (p: loginParams): Dispatchable => (dispatch) => {
    dispatch(onGlobalToast('apiAccountLogin:' + accountApiHost));

    return accountApi.login(p.name, p.password)
        .then((jwt: string) => {
            dispatch(onAccountLoginSuccess(jwt));
        }).catch((err) => {
            dispatch(onApiError(err, accountApiHost + '/login'));
        });
};

export const apiAccountSmsSignup = (p: smsSignupParams): Dispatchable => (dispatch) => {
    return accountApi.smsSignup(p.phone, p.smsCode, p.password)
        .then((jwt: string) => {
            dispatch(onAccountLoginSuccess(jwt));
        })
        .catch((err) => {
            dispatch(onApiError(err, accountApiHost + '/smsSignup'));
        });
};

export const apiAccountResetPassword = (p: resetPasswordParams, onSuccess: () => void): Dispatchable => (dispatch) => {
    return accountApi.resetPassword(p.phone, p.smsCode, p.newPassword)
        .then(() => {
            dispatch(onGlobalToast('密码重置成功'));
            onSuccess();
        }).catch((err) => {
            dispatch(onApiError(err, accountApiHost + '/resetPassword'));
        });
};

const refreshUserToken = (refreshToken: string): Promise<void> => {
    return userPrivateApi.refreshToken(refreshToken).then((data: Token) => {
        REDUX_STORE.dispatch({type: actions.ACTION_USER_REFRESH_TOKEN, payload: data});
    }).catch((err) => {
        REDUX_STORE.dispatch(onApiError(err, userPrivateApiHost + 'refreshToken'));
    });
};

function isUnauthorizedError(err: any): boolean {
    const status = err && err.status;
    return status === 401;
}

export const apiCall = (f: () => Promise<any>): void => {
    f().then(() => {
        console.log('progress end'); // todo 防止同时刷新
    }).catch((err) => {
        if (!isUnauthorizedError(err)) {
            REDUX_STORE.dispatch(onApiError(err, ''));
            return;
        }

        const refreshToken = REDUX_STORE.getState().token.refreshToken;
        if (refreshToken) {
            return refreshUserToken(refreshToken).then(() => {
                return f().catch((errAgain: any) => {
                    if (!isUnauthorizedError(errAgain)) {
                        REDUX_STORE.dispatch(onApiError(errAgain, ''));
                        return;
                    }

                    REDUX_STORE.dispatch({type: actions.REQUIRE_LOGIN});
                });
            });
        }
    });
};

const initialToken: Token = {accessToken: '', refreshToken: ''};
export function token(state: Token = initialToken, action: StandardAction): Token {
    switch (action.type) {
        case actions.ACTION_USER_OAUTH_JUMP_SUCCESS:
            return action.payload.token;
        case actions.ACTION_USER_REFRESH_TOKEN:
            return action.payload;
        case actions.REQUIRE_LOGIN:
            return initialToken;
        case actions.ACTION_USER_LOGOUT_SUCCESS:
            return initialToken;
        default:
            return state;
    }
}

export function userID(state: string= '', action: StandardAction): string {
    switch (action.type) {
        case  actions.ACTION_USER_OAUTH_JUMP_SUCCESS:
            return action.payload.userID;
        default:
            return state;
    }
}