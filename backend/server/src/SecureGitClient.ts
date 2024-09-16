import simpleGit, { SimpleGit } from "simple-git";
import path from "path";
import fs from "fs";
import os from "os";

export type FileData = {
  id: string;
  data: string;
};

export class SecureGitClient {
  private gitUrl: string;
  private sshKeyPath: string;

  constructor(gitUrl: string, sshKeyPath: string) {
    this.gitUrl = gitUrl;
    this.sshKeyPath = sshKeyPath;
  }

  async pushFiles(fileData: FileData[], repository: string): Promise<void> {
    let tempDir: string | undefined;

    try {
      // Create a temporary directory
      tempDir = fs.mkdtempSync(path.posix.join(os.tmpdir(), 'git-push-'));
      console.log(`Temporary directory created: ${tempDir}`);

      // Write files to the temporary directory
      console.log(`Writing ${fileData.length} files.`);
      for (const { id, data } of fileData) {
        const filePath = path.posix.join(tempDir, id);
        const dirPath = path.dirname(filePath);
      
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        fs.writeFileSync(filePath, data);
      }

      // Initialize the simple-git instance with the temporary directory and custom SSH command
      const git: SimpleGit = simpleGit(tempDir, {
        config: [
          'core.sshCommand=ssh -i ' + this.sshKeyPath + ' -o IdentitiesOnly=yes'
        ]
      }).outputHandler((_command, stdout, stderr) => {
        stdout.pipe(process.stdout);
        stderr.pipe(process.stderr);
     });;

      // Initialize a new Git repository
      await git.init();

      // Add remote repository
      await git.addRemote("origin", `${this.gitUrl}:${repository}`);

      // Add files to the repository
      for (const {id, data} of fileData) {
        await git.add(id);
      }

      // Commit the changes
      await git.commit("Add files.");

      // Push the changes to the remote repository
      await git.push("origin", "master", {'--force': null});

      console.log("Files successfully pushed to the repository");

      if (tempDir) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log(`Temporary directory removed: ${tempDir}`);
      }
    } catch (error) {
      if (tempDir) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log(`Temporary directory removed: ${tempDir}`);
      }
      console.error("Error pushing files to the repository:", error);
      throw error;
    }
  }
}