import {
  StatementCompilationBuffer,
  Statement as StatementSyntax
} from '../../syntax';

import * as Syntax from '../core';

import {
  EnterOpcode,
  LabelOpcode,
  PutArgsOpcode,
  JumpOpcode,
  JumpUnlessOpcode,
  EvaluateOpcode,
  ExitOpcode,
  PushChildScopeOpcode,
  PopScopeOpcode
} from '../../compiled/opcodes/vm';

import {
  PutIteratorOpcode,
  EnterListOpcode,
  NextIterOpcode,
  EnterWithKeyOpcode,
  ExitListOpcode
} from '../../compiled/opcodes/lists';

import OpcodeBuilderDSL from '../../compiled/opcodes/builder';

import Environment from '../../environment';

export default class EachSyntax extends StatementSyntax {
  type = "each-statement";

  public args: Syntax.Args;
  public templates: Syntax.Templates;
  public isStatic = false;

  constructor({ args, templates }: { args: Syntax.Args, templates: Syntax.Templates }) {
    super();
    this.args = args;
    this.templates = templates;
  }

  prettyPrint() {
    return `#each ${this.args.prettyPrint()}`;
  }

  compile(dsl: OpcodeBuilderDSL, env: Environment) {
    //         Enter(BEGIN, END)
    // BEGIN:  Noop
    //         PutArgs
    //         PutIterable
    //         JumpUnless(ELSE)
    //         EnterList(BEGIN2, END2)
    // ITER:   Noop
    //         NextIter(BREAK)
    //         EnterWithKey(BEGIN2, END2)
    // BEGIN2: Noop
    //         PushChildScope
    //         Evaluate(default)
    //         PopScope
    // END2:   Noop
    //         Exit
    //         Jump(ITER)
    // BREAK:  Noop
    //         ExitList
    //         Jump(END)
    // ELSE:   Noop
    //         Evalulate(inverse)
    // END:    Noop
    //         Exit

    let { args, templates } = this;

    dsl.unit({ templates }, dsl => {
      dsl.enter('BEGIN', 'END');
      dsl.label('BEGIN');
      dsl.putArgs(args);
      dsl.putIterator();

      let falsyLabel = templates.inverse ? 'ELSE' : 'END';
      dsl.jumpUnless(falsyLabel);

      dsl.unit({ templates }, dsl => {
        dsl.enterList('BEGIN', 'END');
        dsl.label('ITER');
        dsl.nextIter('BREAK');
        dsl.enterWithKey('BEGIN', 'END');
        dsl.label('BEGIN');
        dsl.pushChildScope();
        dsl.evaluate('default');
        dsl.popScope();
        dsl.label('END');
        dsl.exit()
        dsl.jump('ITER');
        dsl.label('BREAK');
        dsl.exitList();
      });

      dsl.jump('END');

      if (templates.inverse) {
        dsl.label('ELSE');
        dsl.evaluate('inverse');
      }

      dsl.label('END');
      dsl.exit();
    })



  }
}
