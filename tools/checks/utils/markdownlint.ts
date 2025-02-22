import markdownlint, { LintError } from 'markdownlint';
import markdownLintConfig from '../../../.markdownlint.json' assert { type: 'json' };
import { createNewPullRequestComment, requiredCheckMessage } from './github.js';
import { IConfig } from './config.js';
import { addToSummaryOfRequirements } from './console.js';
import { Emoji } from './utils.js';

export const lintMarkdownContent = ({ content }: { content: string }) => {
  const options = {
    config: markdownLintConfig,
    strings: {
      content,
    },
    handleRuleFailures: true,
  };

  const result = markdownlint.sync(options);
  if (result && result.content) {
    return result.content;
  }
  return null;
};

export const processMarkdownLintResult = ({
  config,
  fileName,
  result,
}: {
  config: IConfig;
  fileName: string;
  result: LintError;
}) => {
  const errorNames = result.ruleNames.join('/');
  const column = result.errorRange ? `${result.errorRange[0]}` : '';

  /** Console */
  const consoleMessage = `${Emoji.NoEntry} Requirement: In ${fileName}, line ${
    result.lineNumber
  }, ${
    column ? `column ${column}` : ''
  }, markdownlint detected error ${errorNames}: ${result.ruleDescription}. ${
    result.errorDetail ? `${result.errorDetail}. ` : ''
  }For more info, see ${result.ruleInformation}.`;
  console.log(consoleMessage);

  addToSummaryOfRequirements(consoleMessage);

  /** Pull Request */
  if (config.postPullRequestComments) {
    const body = `The content quality library [markdownlint](https://github.com/DavidAnson/markdownlint) says: 

- ${result.ruleDescription} (${errorNames})
${result.errorDetail ? `- ${result.errorDetail}.` : ''}

For more information, see the Markdownlint docs for [${errorNames}](${
      result.ruleInformation
    }). ${
      result.fixInfo
        ? `You might be able to fix this by using [markdownlint for VS Code](https://marketplace.visualstudio.com/items?itemName=DavidAnson.vscode-markdownlint) or by running \`npm ci && npm run markdownlint\`.`
        : ''
    }

${requiredCheckMessage}`;
    createNewPullRequestComment({
      body,
      commit_id: config.commitHash,
      line: result.lineNumber,
      path: fileName,
      pull_number: config.pullRequestNumber,
      repository: config.repository,
    });
  }
};

export const checkMarkdownLint = ({
  config,
  content,
  fileName,
}: {
  config: IConfig;
  content: string;
  fileName: string;
}) => {
  const lintResults = lintMarkdownContent({ content });
  if (config.debug) {
    console.log(`MarkdownLint errors for ${fileName}:`, lintResults);
  }
  if (!lintResults) {
    console.log('No linting errors found.');
    return;
  }
  for (const result of lintResults) {
    processMarkdownLintResult({ config, fileName, result });
  }
};
