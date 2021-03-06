import { AsyncStorage } from 'react-native';
import { REDUX_STORE } from '../App';
import { SERVER_IP } from '../ENV';
import { Dispatchable, StandardAction } from './_common/action';
import { getHeader } from './_react_native_common/fetchHelper';
import { AccountInfo, bindPhoneParams, sendSmsCodeParams, unbindPhoneParams } from './api/account/gen';
import {
    DefaultApiFactory as AccountApi, sendLoginSmsCodeParams, smsLoginParams, UserInfo, UserToken
} from './api/account/gen/';
import { apiTodoGetUserProfile } from './redux';
import { onGlobalToast, TOAST_FAST, TOAST_SLOW } from './ToastView';

const STORAGE_KEY_USER_REFRESH_TOKEN = 'USER_REFRESH_TOKEN';

export const MAX_LOGIN_NAME_LENGTH = 24;
export const MAX_PHONE_LENGTH = 11;
export const MAX_PASSWORD_LENGTH = 20;
export const MAX_SMS_CODE_LENGTH = 6;

export const REQUIRE_LOGIN = 'REQUIRE_LOGIN';
export const ACTION_ACCOUNT_LOGIN_SUCCESS = 'ACTION_ACCOUNT_LOGIN_SUCCESS';
export const ACTION_ACCOUNT_LOGOUT_SUCCESS = 'ACTION_ACCOUNT_LOGOUT_SUCCESS';
export const ACTION_ACCOUNT_REFRESH_TOKEN_SUCCESS = 'ACTION_ACCOUNT_REFRESH_TOKEN_SUCCESS';
export const ACTION_ACCOUNT_GET_USER_INFO_SUCCESS = 'ACTION_ACCOUNT_GET_USER_INFO_SUCCESS';
export const ACTION_ACCOUNT_GET_ACCOUNT_INFO_SUCCESS = 'ACTION_ACCOUNT_GET_ACCOUNT_INFO_SUCCESS';

export const getAccessToken = (): string => {
    const t = REDUX_STORE.getState().userToken;
    return t && t.accessToken ? t.accessToken : '';
};

const accountApiHost = 'http://' + SERVER_IP + ':8080/api/v1/accounts';
const accountApi = AccountApi({apiKey: getAccessToken}, fetch, accountApiHost);

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

export const apiAccountSendLoginSmsCode = (p: sendLoginSmsCodeParams): Dispatchable => (dispatch) => {
    return accountApi.sendLoginSmsCode(p.phone, p.captchaId, p.captchaCode, getHeader())
        .then(() => {
            dispatch(onGlobalToast('已发送', TOAST_FAST));
        }).catch((err) => {
            dispatch(onApiError(err, accountApiHost + '/smsCode'));
        });
};

export const apiAccountSmsLogin = (p: smsLoginParams): Dispatchable => (dispatch) => {
    return accountApi.smsLogin(p.phone, p.smsCode, getHeader())
        .then((userToken: UserToken) => {
            dispatch({type: ACTION_ACCOUNT_LOGIN_SUCCESS, payload: userToken});
            dispatch(saveUserRefreshToken(userToken.refreshToken));
            dispatch(apiAccountGetUserInfo());
            dispatch(apiTodoGetUserProfile());
        }).catch((err) => {
            dispatch(onApiError(err, accountApiHost + '/smsLogin'));
        });
};

export const apiAccountLogout = (): Dispatchable => (dispatch) => {
    return accountApi.logout(getHeader())
        .then(() => {
            dispatch({type: ACTION_ACCOUNT_LOGOUT_SUCCESS});
            dispatch(saveUserRefreshToken(''));
        }).catch((err) => {
            dispatch(onApiError(err, accountApiHost + '/logout'));
        });
};

export const apiAccountGetUserInfo = (): Dispatchable => (dispatch) => {
    return accountApi.getUserInfo(getHeader())
        .then((userInfo: UserInfo) => {
            dispatch({type: ACTION_ACCOUNT_GET_USER_INFO_SUCCESS, payload: userInfo});
        }).catch((err) => {
            dispatch(onApiError(err, accountApiHost + '/getUserInfo'));
        });
};

export const apiAccountSetUserName = (userName: string, onSuccess: () => void)
    : Dispatchable => (dispatch) => {
    return accountApi.setUserName(userName)
        .then(() => {
            onSuccess();
            dispatch(apiAccountGetUserInfo());
        }).catch((err) => {
            dispatch(onApiError(err, accountApiHost + '/setUserName'));
        });
};

export const apiAccountSetUserIcon = (userIcon: string, onSuccess: () => void)
    : Dispatchable => (dispatch) => {
    return accountApi.setUserIcon(userIcon).then(() => {
        onSuccess();
        dispatch(apiAccountGetUserInfo());
    }).catch((err) => {
        dispatch(onApiError(err, accountApiHost + '/setUserIcon'));
    });
};

export const apiAccountGetAccountInfo = (): Dispatchable => (dispatch) => {
    return accountApi.getAccountInfo()
        .then((accountInfo: AccountInfo) => {
            dispatch({type: 'ACTION_ACCOUNT_GET_ACCOUNT_INFO_SUCCESS', payload: accountInfo});
        }).catch((err) => {
            dispatch(onApiError(err, accountApiHost + '/getAccountInfo'));
        });
};

export const apiAccountSendSmsCode = (p: sendSmsCodeParams): Dispatchable => (dispatch) => {
  return accountApi.sendSmsCode(p.scene, p.phone, p.captchaId, p.captchaCode).then(() => {
      dispatch(onGlobalToast('已发送', TOAST_FAST));
  }).catch((err) => {
      dispatch(onApiError(err, accountApiHost + '/sendSmsCode'));
  });
};

export const apiAccountBindPhone = (p: bindPhoneParams): Dispatchable => (dispatch) => {
    return accountApi.bindPhone(p.phone, p.smsCode).then(() => {
        dispatch(onGlobalToast('绑定成功', TOAST_FAST));
        dispatch(apiAccountGetAccountInfo());
    }).catch((err) => {
        dispatch(onApiError(err, accountApiHost + '/bindPhone'));
    });
};

export const apiAccountUnbindPhone = (p: unbindPhoneParams): Dispatchable => (dispatch) => {
    return accountApi.unbindPhone(p.phone, p.smsCode).then(() => {
        dispatch(onGlobalToast('解除绑定成功', TOAST_FAST));
    }).catch((err) => {
        dispatch(onApiError(err, accountApiHost + '/unbindPhone'));
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

            accountApi.refreshToken(refreshToken, getHeader())
                .then((userToken: UserToken) => {
                    dispatch({type: ACTION_ACCOUNT_REFRESH_TOKEN_SUCCESS, payload: userToken});
                    dispatch(saveUserRefreshToken(userToken.refreshToken));
                    dispatch(onGlobalToast('登录成功', TOAST_FAST));
                    dispatch(apiAccountGetUserInfo());
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
    return accountApi.refreshToken(refreshToken, getHeader())
        .then((data: UserToken) => {
            REDUX_STORE.dispatch({type: ACTION_ACCOUNT_REFRESH_TOKEN_SUCCESS, payload: data});
            REDUX_STORE.dispatch(saveUserRefreshToken(data.refreshToken));
        })
        .catch((err) => {
            REDUX_STORE.dispatch(onApiError(err, accountApiHost + ' refreshToken'));
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

        const refreshToken = REDUX_STORE.getState().userToken.refreshToken;
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

const initUserToken: UserToken = {
    accessToken: '',
    refreshToken: ''
};
export const userTokenReducer = (state: UserToken = initUserToken, action: StandardAction): UserToken => {
    switch (action.type) {
        case ACTION_ACCOUNT_LOGIN_SUCCESS:
            return action.payload;
        case ACTION_ACCOUNT_REFRESH_TOKEN_SUCCESS:
            return action.payload;
        case REQUIRE_LOGIN:
            return initUserToken;
        case ACTION_ACCOUNT_LOGOUT_SUCCESS:
            return initUserToken;
        default:
            return state;
    }
};

const initUserInfo: UserInfo = {
    userId: '',
    userName: '',
    userIcon: ''
};
export const userInfoReducer = (state: UserInfo = initUserInfo, action: StandardAction): UserInfo => {
    switch (action.type) {
        case ACTION_ACCOUNT_GET_USER_INFO_SUCCESS:
            return action.payload;
        default:
            return state;
    }
};

const initAccountInfo: AccountInfo = {
    userId: '',
    userName: '',
    userIcon: '',
    phoneBinded: '',
    oauthBindedList: [],
};
export const accountInfoReducer = (state: AccountInfo= initAccountInfo, action: StandardAction)
    : AccountInfo => {
    switch (action.type) {
        case ACTION_ACCOUNT_GET_ACCOUNT_INFO_SUCCESS:
            return action.payload;
        default:
            return state;
    }
};