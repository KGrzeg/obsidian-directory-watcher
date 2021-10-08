import {
	App,
	MenuItem,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	TFolder,
	debounce,
	TAbstractFile
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
	filesToAdd: TAbstractFile[];
	updateNote: any;

	async onload() {
		log('loading plugin');

		await this.loadSettings();
		log('The settings:', this.settings);

		this.filesToAdd = [];
		this.updateNote = debounce(this.updateNote_raw, 500, true);

		this.addSettingTab(new SampleSettingTab(this.app, this));

		this.registerDevBadge();
		this.registerContextMenu();
		this.registerEvent(this.app.vault.on("create", newImage => {
			if (newImage.parent.path == this.settings.directoryToWatch) {
				this.addToNote(newImage);
			}
		}));
	}

	onunload() {
		log('unloading plugin');
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

	addToNote(fileName: TAbstractFile) {
		this.filesToAdd.push(fileName);
		log(`Added ${fileName} to update list`);
		this.updateNote();
	}

	prepareContent(previousContent: string, filesToAdd: TAbstractFile[]) {
		const appendLines = filesToAdd
			.map(fileName => `- ![[${fileName.name}]]`)
			.join('\n');

		const newContent = previousContent + '\n' + appendLines;

		//sort and remove doubles
		return newContent
			.split('\n')
			.sort((a, b) => a.localeCompare(b))
			//remove duplicates taking advantage from sorted lines
			.filter((item, pos, arr) => !pos || item != arr[pos - 1])
			.join('\n');
	}

	async updateNote_raw() {
		const filesToAdd = this.filesToAdd;
		this.filesToAdd = [];

		log(`Execute updating with `, filesToAdd);

		const noteToUpdate = this.app.vault.getAbstractFileByPath(this.settings.noteToUpdate);
		if (noteToUpdate instanceof TFile) {
			const previousContent = await this.app.vault.read(noteToUpdate);
			const content = this.prepareContent(previousContent, filesToAdd);

			await this.app.vault.modify(
				noteToUpdate,
				content
			);

			log(`Updated ${noteToUpdate.path} with ${filesToAdd.length} lines`);
		} else {
			console.error("The note to update do not exists");
		}
	}

	async updateDirectoryPath(path: string) {
		console.log(this);

		this.settings.directoryToWatch = path;
		await this.saveSettings();
	}

	async updateNotePath(path: string) {
		this.settings.noteToUpdate = path;
		await this.saveSettings();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: DirectoryWatcher;

	constructor(app: App, plugin: DirectoryWatcher) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let { containerEl } = this;

		containerEl.empty();

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
