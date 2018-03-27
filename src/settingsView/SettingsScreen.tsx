import * as React from 'react';
import { StyleSheet, Text, TouchableHighlight, View } from 'react-native';
import { NavigationScreenProps } from 'react-navigation';
import { connect } from 'react-redux';
import { Dispatchable } from '../_common/action';
import SelectionModal, { SelectionItem } from '../_react_native_common/SelectionModal';
import { TodoVisibility, UserProfile } from '../api/todo-private/gen';
import { commonStyles } from '../commonStyles';
import { apiTodoUserProfileUpdateTodoVisibility, RootState } from '../redux';
import ToastView, { onGlobalToast } from '../ToastView';
import { getTodoVisibilityName } from '../utils';

export interface Props extends NavigationScreenProps<void> {
    userProfile: UserProfile;
    onGlobalToast: (text: string) => Dispatchable;
    apiTodoUserProfileUpdateTodoVisibility: (visibility: TodoVisibility) => Dispatchable;
}

interface State {
    showVisibilitySelectionPanel: boolean;
}

class SettingsScreen extends React.Component<Props, State> {
    public componentWillMount() {
        this.onTodoVisibilitySelected = this.onTodoVisibilitySelected.bind(this);
        this.onUserNamePressed = this.onUserNamePressed.bind(this);
        this.onAccountSettingsPressed = this.onAccountSettingsPressed.bind(this);
        this.showVisibilitySelectionPanel = this.showVisibilitySelectionPanel.bind(this);
        this.closeVisibilitySelectionPanel = this.closeVisibilitySelectionPanel.bind(this);
        this.onAboutPressed = this.onAboutPressed.bind(this);
        this.onHelpPressed = this.onHelpPressed.bind(this);

        const initialState: State = {
            showVisibilitySelectionPanel: false
        };
        this.setState(initialState);
    }

    public render() {
        return (
            <View style={[styles.screen]}>
                {this.renderAccountSettings()}
                <View style={[commonStyles.line]}/>
                {this.renderNameSetting()}
                {this.renderVisibilitySetting()}
                {this.renderHelp()}
                <View style={[commonStyles.line]}/>
                {this.renderAbout()}
                <ToastView/>
                <SelectionModal
                    items={[
                        {label: getTodoVisibilityName(TodoVisibility.Public), value: TodoVisibility.Public},
                        {label: getTodoVisibilityName(TodoVisibility.Friend), value: TodoVisibility.Friend},
                        {label: getTodoVisibilityName(TodoVisibility.Private), value: TodoVisibility.Private}
                    ]}
                    visible={this.state.showVisibilitySelectionPanel}
                    onClose={this.closeVisibilitySelectionPanel}
                    onSelect={this.onTodoVisibilitySelected}
                />
            </View>
        );
    }

    private renderAccountSettings() {
        return (
            <TouchableHighlight
                underlayColor={underlayColor}
                style={[styles.settingItem, styles.blank]}
                onPress={this.onAccountSettingsPressed}
            >
                <View style={[commonStyles.flexRowSpaceBetween]}>
                    <Text style={[commonStyles.text]}>帐号与安全</Text>
                </View>
            </TouchableHighlight>
        );
    }

    private renderNameSetting() {
        const userName = this.props.userProfile.userName;

        return (
            <TouchableHighlight
                underlayColor={underlayColor}
                style={[styles.settingItem]}
                onPress={this.onUserNamePressed}
            >
                <View style={[commonStyles.flexRowSpaceBetween]}>
                    <Text style={[commonStyles.text]}>你的名字</Text>
                    <Text style={[commonStyles.text]}>{userName}</Text>
                </View>
            </TouchableHighlight>
        );
    }

    private renderVisibilitySetting() {
        const {userProfile} = this.props;
        const todoVisibility = getTodoVisibilityName(userProfile && userProfile.todoVisibility);

        return (
            <TouchableHighlight
                underlayColor={underlayColor}
                style={[styles.settingItem, styles.blank]}
                onPress={this.showVisibilitySelectionPanel}
            >
                <View style={[commonStyles.flexRowSpaceBetween]}>
                    <Text style={[commonStyles.text]}>计划是否公开</Text>
                    <Text style={[commonStyles.text]}>{todoVisibility}</Text>
                </View>
            </TouchableHighlight>
        );
    }

    private renderAbout() {
        return (
            <TouchableHighlight
                underlayColor={underlayColor}
                style={[styles.settingItem]}
                onPress={this.onAboutPressed}
            >
                <View style={[commonStyles.flexRowSpaceBetween]}>
                    <Text style={[commonStyles.text]}>关于火星计划</Text>
                </View>
            </TouchableHighlight>
        );
    }

    private renderHelp() {
        return (
            <TouchableHighlight
                underlayColor={underlayColor}
                style={[styles.settingItem, styles.blank]}
                onPress={this.onHelpPressed}
            >
                <View style={[commonStyles.flexRowSpaceBetween]}>
                    <Text style={[commonStyles.text]}>帮助与反馈</Text>
                </View>
            </TouchableHighlight>
        );
    }

    private showVisibilitySelectionPanel() {
        this.setState({showVisibilitySelectionPanel: true});
    }

    private closeVisibilitySelectionPanel() {
        this.setState({showVisibilitySelectionPanel: false});
    }

    private onTodoVisibilitySelected(item: SelectionItem): void {
        this.props.apiTodoUserProfileUpdateTodoVisibility(item.value);
    }

    private onAccountSettingsPressed() {
        this.props.navigation.navigate('AccountSettings');
    }

    private onUserNamePressed() {
        this.props.navigation.navigate('UserName');
    }

    private onHelpPressed() {
        this.props.onGlobalToast('功能暂未开放');
    }

    private onAboutPressed() {
        this.props.onGlobalToast('功能暂未开放');
    }
}

const selectProps = (rootState: RootState) => ({
    userProfile: rootState.userProfile
});

export default connect(selectProps, {
    onGlobalToast,
    apiTodoUserProfileUpdateTodoVisibility
})(SettingsScreen);

const underlayColor = '#bbb';
const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#eee'
    },
    settingItem: {
        backgroundColor: '#fff',
        paddingHorizontal: 8
    },
    blank: {
      marginTop: 24
    }
});