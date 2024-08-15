import {
  Field,
  PublicKey,
  SmartContract,
  State,
  ZkProgram,
  method,
  state,
} from 'o1js';

import {
  ZkonZkProgram,
  ZkonRequestCoordinator,
  ExternalRequestEvent,
} from 'zkon-zkapp';

const coordinatorAddress = PublicKey.fromBase58(
  'B62qnmsn4Bm4MzPujKeN1faxedz4p1cCAwA9mKAWzDjfb4c1ysVvWeK'
);

export let ZkonProof_ = ZkProgram.Proof(ZkonZkProgram);
export class ZkonProof extends ZkonProof_ {}

export class Request extends SmartContract {
  @state(Field) result = State<Field>();

  events = {
    requested: ExternalRequestEvent,
  };

  @method.returns(Field)
  async sendRequest(hashPart1: Field, hashPart2: Field) {
    const coordinator = new ZkonRequestCoordinator(coordinatorAddress);

    const requestId = await coordinator.sendRequest(
      this.address,
      hashPart1,
      hashPart2
    );

    const event = new ExternalRequestEvent({
      id: requestId,
      hash1: hashPart1,
      hash2: hashPart2,
    });

    this.emitEvent('requested', event);

    return requestId;
  }

  @method
  async receiveZkonResponse(requestId: Field, proof: ZkonProof) {
    const coordinator = new ZkonRequestCoordinator(coordinatorAddress);
    await coordinator.recordRequestFullfillment(requestId, proof);
    this.result.set(proof.publicInput.dataField);
  }

  @method async someOtherMethod() {}
}
