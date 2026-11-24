pragma solidity 0.8.30;

contract CarInsurance {
    enum State { Created, Active, ClaimSubmitted, PaidOut, Rejected, Cancelled }

    struct Policy {
        address insurer;
        address client;
        address assessor;
        string carInfo;
        uint256 premium;
        uint256 maxCoverage;
        uint256 claimAmount;
        string reason;
        State state;
    }

    mapping(uint256 => Policy) private policies;
    uint256 public policyCount;
    bool private locked;

    event PolicyCreated(uint256 indexed policyId, address indexed insurer, address indexed client, address assessor, uint256 premium, uint256 maxCoverage);
    event PolicyBought(uint256 indexed policyId);
    event ClaimSubmitted(uint256 indexed policyId, uint256 claimAmount, string reason);
    event ClaimApproved(uint256 indexed policyId, uint256 clientPayment, uint256 insurerPayment);
    event ClaimRejected(uint256 indexed policyId, uint256 insurerPayment);
    event PolicyCancelledByInsurer(uint256 indexed policyId, uint256 insurerPayment);
    event PolicyCancelledByClient(uint256 indexed policyId, uint256 clientRefund, uint256 insurerPayment);

    modifier nonReentrant() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }

    modifier policyExists(uint256 policyId) {
        require(policyId > 0 && policyId <= policyCount, "Policy does not exist");
        _;
    }

    function createPolicy(
        address client,
        address assessor,
        string calldata carInfo,
        uint256 premium
    ) external payable nonReentrant returns (uint256) {
        require(client != address(0) && assessor != address(0), "Zero address");
        require(msg.sender != client && msg.sender != assessor && client != assessor, "Participants must differ");
        require(bytes(carInfo).length > 0, "Car info is empty");
        require(premium > 0, "Premium must be positive");
        require(msg.value > premium, "Reserve must exceed premium");
        require(msg.value <= type(uint256).max - premium, "Total amount overflow");

        policyCount++;
        uint256 policyId = policyCount;

        policies[policyId] = Policy({
            insurer: msg.sender,
            client: client,
            assessor: assessor,
            carInfo: carInfo,
            premium: premium,
            maxCoverage: msg.value,
            claimAmount: 0,
            reason: "",
            state: State.Created
        });

        emit PolicyCreated(policyId, msg.sender, client, assessor, premium, msg.value);
        return policyId;
    }

    function getPolicy(uint256 policyId) external view policyExists(policyId) returns (Policy memory) {
        return policies[policyId];
    }
}