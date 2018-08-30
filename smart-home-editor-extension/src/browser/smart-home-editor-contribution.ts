import { injectable, inject } from "inversify";
import { CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry, SelectionService, notEmpty, UriSelection } from "@theia/core/lib/common";
import { CommonMenus } from "@theia/core/lib/browser";
import { UriAwareCommandHandler, UriCommandHandler } from "@theia/core/lib/common/uri-command-handler";
import URI from '@theia/core/lib/common/uri';
import { FileSystem } from "@theia/filesystem/lib/common/filesystem";
import { Workspace } from "@theia/languages/lib/common";
import { IYoServer, ScaffoldingOptions } from "../common/scaffolding-protocol";

export const DeployToEditorCommand = {
    id: 'SmartHomeEditor.deploy.command',
    label: "Deploy App "
};

export const ScaffoldingCommand = {
    id: 'SmartHomeEditor.scaffolding.command',
    label: "New Smart Home App project"
};

@injectable()
export class SmartHomeEditorCommandContribution implements CommandContribution {

    @inject(SelectionService)
    protected readonly selectionService: SelectionService;

    @inject(FileSystem)
    protected readonly filesystem: FileSystem;

    @inject(IYoServer)
    protected readonly yoServer: IYoServer;

    @inject(Workspace)
    protected readonly workspace: Workspace;

    registerCommands(registry: CommandRegistry): void {
        const handler = new UriAwareCommandHandler<URI[]>(this.selectionService, this.deployHandler(), { multi: true });
        registry.registerCommand(DeployToEditorCommand, handler);
        registry.registerCommand(ScaffoldingCommand, this.scaffoldingHandler())
    }

    protected deployHandler(): UriCommandHandler<URI[]> {
        return {
            execute: uris => this.deployApp(uris),
            isEnabled: uris => this.isDeployEnabled(uris),
            isVisible: uris => this.isDeployVisible(uris),
        };
    }

    protected scaffoldingHandler() {
        return {
            execute: () => {
                console.log('workspace root uri', this.workspace.rootUri);
                console.log('workspace root path', this.workspace.rootPath);
                const options: ScaffoldingOptions = {
                    appName: 'ConfiguredAppName',
                    appDescription: 'Configured App Description',
                    appNameSpace: 'smarthome.example.apps',
                    destinationPath: this.workspace.rootPath
                };
                this.yoServer.requestYo(options);
            }
        }
    }
    protected async deployApp(uris: URI[]): Promise<void> {
        new Promise(() => {
            uris.forEach(uri => {
                this.filesystem.copy(
                    uri.toString(),
                    "file:///usr/local/addons/essh/.essh_store/" + uri.displayName,
                    { overwrite: true, recursive: true }
                )
            })
            null
        })
    }
    protected isDeployEnabled(uris: URI[]): boolean {
        return uris.length > 0 && uris.every(u => u.scheme === 'file') && uris.every(u => u.path.ext === '.jar');
    }
    protected isDeployVisible(uris: URI[]): boolean {
        return this.isDeployEnabled(uris);
    }
    protected getUris(uri: Object | undefined): URI[] {
        if (uri === undefined) {
            return [];
        }
        return (Array.isArray(uri) ? uri : [uri]).map(u => this.getUri(u)).filter(notEmpty);
    }
    protected getUri(uri: Object | undefined): URI | undefined {
        if (uri instanceof URI) {
            return uri;
        }
        if (UriSelection.is(uri)) {
            return uri.uri;
        }
        return undefined;
    }
}

@injectable()
export class SmartHomeEditorMenuContribution implements MenuContribution {

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(CommonMenus.FILE_SAVE, {
            commandId: DeployToEditorCommand.id,
            label: DeployToEditorCommand.label
        });
        menus.registerMenuAction(CommonMenus.FILE_SAVE, {
            commandId: ScaffoldingCommand.id,
            label: ScaffoldingCommand.label
        });
    }
}
