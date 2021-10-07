import {
	App,
	MenuItem,
	// Modal,
	// Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	TFolder
} from 'obsidian';

// manage manually for now
// TODO: pass BUILD env from rollup to plugin
const DEV = true;

function log(message?: any, ...optionalParams: any[]): void {
	if (DEV) console.log(message, ...optionalParams);
}

interface DirectoryWatcherSettings {
	directoryToWatch: string;
	noteToUpdate: string;
}

const DEFAULT_SETTINGS: DirectoryWatcherSettings = {
	directoryToWatch: '',
	noteToUpdate: ''
}

export default class DirectoryWatcher extends Plugin {
	settings: DirectoryWatcherSettings;

	async onload() {
		log('loading plugin');

		await this.loadSettings();
		log('The sttings:', this.settings);


		// this.addRibbonIcon('dice', 'Sample Plugin', () => {
		// 	new Notice('This is a notice!');
		// });


		this.registerDevBadge();
		this.registerContextMenu();
		this.startWatching();

		// this.addCommand({
		// 	id: 'open-sample-modal',
		// 	name: 'Open Sample Modal',
		// 	// callback: () => {
		// 	// 	log('Simple Callback');
		// 	// },
		// 	checkCallback: (checking: boolean) => {
		// 		let leaf = this.app.workspace.activeLeaf;
		// 		if (leaf) {
		// 			if (!checking) {
		// 				new SampleModal(this.app).open();
		// 			}
		// 			return true;
		// 		}
		// 		return false;
		// 	}
		// });

		this.addSettingTab(new SampleSettingTab(this.app, this));

		// this.registerCodeMirror((cm: CodeMirror.Editor) => {
		// 	log('codemirror', cm);
		// });

		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	log('click', evt);
		// });

		// this.registerInterval(window.setInterval(() => log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {
		log('unloading plugin');
		this.stopWatching();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	registerContextMenu() {
		this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => {
			const path = file.path;

			if (file instanceof TFile) {
				if (file.extension === 'md')
					menu.addItem((item: MenuItem) => {
						item
							.setTitle("Set as file to update")
							.setIcon("star")
							.onClick(async () => {
								log("Kliknąłeś plik o ścieżce " + path);
								await this.updateNotePath(path);
							});
					});
			}
			if (file instanceof TFolder) {
				menu.addItem((item: MenuItem) => {
					item
						.setTitle("Set as watched directory")
						.setIcon("star")
						.onClick(async () => {
							log("Kliknąłeś folder o ścieżce " + path);
							await this.updateDirectoryPath(path);
						});
				});
			}
		}));
	}

	registerDevBadge() {
		if (DEV) {
			const devBadge = this.addStatusBarItem();
			devBadge.setText('Dev Plugin Enabled *');
			devBadge.style.color = "yellowgreen";
		}
	}

	startWatching() {
		this.registerEvent(this.app.vault.on("create", (file) => {
			if (file.parent.path == this.settings.directoryToWatch){
				log(file);
			}
		}));
	}

	stopWatching() {
		log("Stop watching " + this.settings.directoryToWatch);
	}

	async updateDirectoryPath(path: string) {
		console.log(this);
		this.stopWatching();

		this.settings.directoryToWatch = path;
		await this.saveSettings();

		this.startWatching();
	}

	async updateNotePath(path: string) {
		this.settings.noteToUpdate = path;
		await this.saveSettings();
	}
}

// class SampleModal extends Modal {
// 	constructor(app: App) {
// 		super(app);
// 	}

// 	onOpen() {
// 		let {contentEl} = this;
// 		contentEl.setText('Woah!');
// 	}

// 	onClose() {
// 		let {contentEl} = this;
// 		contentEl.empty();
// 	}
// }

class SampleSettingTab extends PluginSettingTab {
	plugin: DirectoryWatcher;

	constructor(app: App, plugin: DirectoryWatcher) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let { containerEl } = this;

		containerEl.empty();

		// containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Directory to watch')
			.setDesc('The changes in the directory will be reflected in note.'
				+ 'Use context menu in file explorer to change the value.')
			.addText(text => text
				.setPlaceholder('Relative path to directory')
				.setValue(this.plugin.settings.directoryToWatch)
				.setDisabled(true));

		new Setting(containerEl)
			.setName('Note to update')
			.setDesc('The changes will be pasted to this note. Use context menu in file explorer to change the value.')
			.addText(text => text
				.setPlaceholder('Name of note')
				.setValue(this.plugin.settings.noteToUpdate)
				.setDisabled(true));
	}
}
