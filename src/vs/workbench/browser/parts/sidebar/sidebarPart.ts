/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/sidebarpart';
import { TPromise } from 'vs/base/common/winjs.base';
import nls = require('vs/nls');
import { Registry } from 'vs/platform/platform';
import { Action } from 'vs/base/common/actions';
import { CompositePart } from 'vs/workbench/browser/parts/compositePart';
import { Viewlet, ViewletRegistry, Extensions as ViewletExtensions } from 'vs/workbench/browser/viewlet';
import { IWorkbenchActionRegistry, Extensions as ActionExtensions } from 'vs/workbench/common/actionRegistry';
import { SyncActionDescriptor } from 'vs/platform/actions/common/actions';
import { IViewletService } from 'vs/workbench/services/viewlet/browser/viewlet';
import { IPartService, Parts } from 'vs/workbench/services/part/common/partService';
import { IViewlet } from 'vs/workbench/common/viewlet';
import { Scope } from 'vs/workbench/browser/actionBarRegistry';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { IContextMenuService } from 'vs/platform/contextview/browser/contextView';
import { IMessageService } from 'vs/platform/message/common/message';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IKeybindingService } from 'vs/platform/keybinding/common/keybinding';
import { KeyMod, KeyCode } from 'vs/base/common/keyCodes';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import Event from 'vs/base/common/event';

export interface ISidebar {
	onDidViewletOpen: Event<IViewlet>;
	onDidViewletClose: Event<IViewlet>;
	openViewlet(id: string, focus?: boolean): TPromise<IViewlet>;
	getActiveViewlet(): IViewlet;
	getLastActiveViewletId(): string;
	hideActiveViewlet(): TPromise<void>;
}

export class SidebarPart extends CompositePart<Viewlet> implements ISidebar {

	public static activeViewletSettingsKey = 'workbench.sidebar.activeviewletid';

	public _serviceBrand: any;

	private blockOpeningViewlet: boolean;

	constructor(
		id: string,
		@IMessageService messageService: IMessageService,
		@IStorageService storageService: IStorageService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IPartService partService: IPartService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IInstantiationService instantiationService: IInstantiationService
	) {
		super(
			messageService,
			storageService,
			telemetryService,
			contextMenuService,
			partService,
			keybindingService,
			instantiationService,
			(<ViewletRegistry>Registry.as(ViewletExtensions.Viewlets)),
			SidebarPart.activeViewletSettingsKey,
			'sideBar',
			'viewlet',
			Scope.VIEWLET,
			id
		);
	}

	public get onDidViewletOpen(): Event<IViewlet> {
		return this._onDidCompositeOpen.event;
	}

	public get onDidViewletClose(): Event<IViewlet> {
		return this._onDidCompositeClose.event;
	}

	public openViewlet(id: string, focus?: boolean): TPromise<Viewlet> {
		if (this.blockOpeningViewlet) {
			return TPromise.as(null); // Workaround against a potential race condition
		}

		// First check if sidebar is hidden and show if so
		if (!this.partService.isVisible(Parts.SIDEBAR_PART)) {
			try {
				this.blockOpeningViewlet = true;
				this.partService.setSideBarHidden(false);
			} finally {
				this.blockOpeningViewlet = false;
			}
		}

		return this.openComposite(id, focus);
	}

	public getActiveViewlet(): IViewlet {
		return <IViewlet>this.getActiveComposite();
	}

	public getLastActiveViewletId(): string {
		return this.getLastActiveCompositetId();
	}

	public hideActiveViewlet(): TPromise<void> {
		return this.hideActiveComposite().then(composite => void 0);
	}
}

class FocusSideBarAction extends Action {

	public static ID = 'workbench.action.focusSideBar';
	public static LABEL = nls.localize('focusSideBar', "Focus into Side Bar");

	constructor(
		id: string,
		label: string,
		@IViewletService private viewletService: IViewletService,
		@IPartService private partService: IPartService
	) {
		super(id, label);
	}

	public run(): TPromise<boolean> {

		// Show side bar
		if (!this.partService.isVisible(Parts.SIDEBAR_PART)) {
			this.partService.setSideBarHidden(false);
		}

		// Focus into active viewlet
		else {
			let viewlet = this.viewletService.getActiveViewlet();
			if (viewlet) {
				viewlet.focus();
			}
		}

		return TPromise.as(true);
	}
}

let registry = <IWorkbenchActionRegistry>Registry.as(ActionExtensions.WorkbenchActions);
registry.registerWorkbenchAction(new SyncActionDescriptor(FocusSideBarAction, FocusSideBarAction.ID, FocusSideBarAction.LABEL, {
	primary: KeyMod.CtrlCmd | KeyCode.KEY_0
}), 'View: Focus into Side Bar', nls.localize('viewCategory', "View"));
